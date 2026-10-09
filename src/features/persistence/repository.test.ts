import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { beforeAll, describe, expect, it } from 'vitest';
import { createElement, createPresentation, createSlide } from '../../lib/defaults';
import { assetReferences, deleteProject, deleteSetting, getAsset, getLastProject, getProject, getSetting, listProjects, putAsset, putSetting, saveProject } from './repository';

const legacy = createPresentation();
legacy.id = 'legacy-project';

beforeAll(async () => {
  const db = await openDB('chapter-editor', 1, {
    upgrade(database) {
      const projects = database.createObjectStore('projects', { keyPath: 'id' });
      projects.createIndex('by-updated', 'updatedAt');
      database.createObjectStore('assets');
    },
  });
  await db.put('projects', legacy);
  await db.put('assets', new Blob(['legacy image']), 'legacy-asset');
  db.close();
});

describe('project repository', () => {
  it('upgrades a version-one database without losing projects or assets', async () => {
    expect(await getProject(legacy.id)).toEqual(legacy);
    expect(await getAsset('legacy-asset')).toBeDefined();
    await putSetting('editor-preferences', { zoom: 1.25, guides: true, recent: [legacy.id] });
    expect(await getSetting('editor-preferences')).toEqual({ zoom: 1.25, guides: true, recent: [legacy.id] });
    await putSetting('editor-preferences', { zoom: 2 });
    expect(await getSetting('editor-preferences')).toEqual({ zoom: 2 });
    await deleteSetting('editor-preferences');
    expect(await getSetting('editor-preferences')).toBeUndefined();
    expect((await listProjects()).some(project => project.id === legacy.id)).toBe(true);
  });

  it('replaces saved projects and orders summaries and restore by update time', async () => {
    const earlier = createPresentation(), latest = createPresentation();
    earlier.id = 'earlier-project'; earlier.updatedAt = '2098-01-01T00:00:00.000Z';
    latest.id = 'latest-project'; latest.updatedAt = '2099-01-01T00:00:00.000Z';
    await saveProject(latest); await saveProject(earlier);
    latest.title = 'Revised title'; latest.slides = [createSlide('blank')];
    await saveProject(latest);
    expect(await getLastProject()).toEqual(latest);
    const summaries = await listProjects();
    expect(summaries.slice(0, 2).map(project => project.id)).toEqual([latest.id, earlier.id]);
    expect(summaries[0]).toMatchObject({ title: 'Revised title', slideCount: 1, createdAt: latest.createdAt, updatedAt: latest.updatedAt, theme: latest.theme });
    expect(summaries[0]?.preview).toEqual(latest.slides[0]);
    expect(summaries.filter(project => project.id === latest.id)).toHaveLength(1);
    await deleteProject(latest.id); await deleteProject(earlier.id);
  });

  it('collects every image-bearing field without duplicate references', () => {
    const document = createPresentation(), slide = createSlide();
    const image = createElement('image'), shape = createElement('shape'), text = createElement('text'), table = createElement('table');
    slide.background = { type: 'image', assetId: 'background', fit: 'cover' };
    image.assetId = 'shared';
    shape.fill = { type: 'image', assetId: 'shared', fit: 'cover' };
    text.fill = { type: 'image', assetId: 'text-fill', fit: 'contain' };
    table.style.headerFill = { type: 'image', assetId: 'table-header', fit: 'tile' };
    const cell = table.rows[0]?.cells[0];
    if (!cell) throw new Error('Expected a table cell');
    cell.fill = { type: 'image', assetId: 'table-cell', fit: 'cover' };
    slide.elements = [image, shape, text, table]; document.slides = [slide];
    expect(assetReferences(document)).toEqual(['background', 'shared', 'text-fill', 'table-header', 'table-cell']);
  });

  it('deletes only unshared assets of the removed project, preserving pending imports', async () => {
    const retained = createPresentation(), slide = createSlide();
    retained.id = 'retained-project';
    const image = createElement('image'), shape = createElement('shape'), text = createElement('text'), table = createElement('table');
    slide.background = { type: 'image', assetId: 'shared-background', fit: 'cover' };
    image.assetId = 'shared-image';
    shape.fill = { type: 'image', assetId: 'shared-shape', fit: 'cover' };
    text.fill = { type: 'image', assetId: 'shared-text', fit: 'cover' };
    table.style.headerFill = { type: 'image', assetId: 'shared-header', fit: 'cover' };
    const cell = table.rows[0]?.cells[0];
    if (!cell) throw new Error('Expected a table cell');
    cell.fill = { type: 'image', assetId: 'shared-cell', fit: 'cover' };
    slide.elements = [image, shape, text, table]; retained.slides = [slide];
    const shared = assetReferences(retained);
    const removed = createPresentation(), removedSlide = createSlide();
    removed.id = 'removed-project';
    removedSlide.elements = [...shared, 'exclusive-asset'].map(assetId => ({ ...createElement('image'), assetId }));
    removed.slides = [removedSlide];
    for (const reference of [...shared, 'exclusive-asset', 'pending-import']) await putAsset(reference, new Blob([reference]));
    await saveProject(removed); await saveProject(retained);
    await deleteProject(removed.id);
    expect(await getProject(removed.id)).toBeUndefined();
    expect(await getProject(retained.id)).toEqual(retained);
    expect(await getAsset('exclusive-asset')).toBeUndefined();
    for (const reference of shared) expect(await getAsset(reference)).toBeDefined();
    expect(await getAsset('pending-import')).toBeDefined();
    await deleteProject(retained.id);
    for (const reference of shared) expect(await getAsset(reference)).toBeUndefined();
    expect(await getAsset('pending-import')).toBeDefined();
    expect(await getAsset('legacy-asset')).toBeDefined();
  });

  it('does not collect any assets when deleting a nonexistent project', async () => {
    await putAsset('unclaimed-asset', new Blob(['not yet saved']));
    await deleteProject('missing-project');
    expect(await getAsset('unclaimed-asset')).toBeDefined();
    expect(await getProject(legacy.id)).toEqual(legacy);
  });
});
