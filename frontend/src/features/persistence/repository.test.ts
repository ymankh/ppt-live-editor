import 'fake-indexeddb/auto';
import { Blob as NativeBlob } from 'node:buffer';
import { openDB } from 'idb';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createElement, createPresentation, createSlide } from '../../lib/defaults';
import { assetReferences, assetUrl, deleteProject, deleteSetting, getAsset, getLastProject, getProject, getSetting, listProjects, putAsset, putSetting, saveProject } from './repository';

const legacy = createPresentation();
legacy.id = 'legacy/project #1';
const legacySlide = createSlide('blank');
const legacyImage = createElement('image'), sharedImage = createElement('image');
legacyImage.assetId = 'legacy asset/#';
sharedImage.assetId = 'shared-asset';
legacySlide.background = { type: 'image', assetId: 'data:image/png;base64,embedded', fit: 'cover' };
legacySlide.elements = [legacyImage, sharedImage];
legacy.slides = [legacySlide];
const serverCollision = createPresentation();
serverCollision.id = 'server-project';
serverCollision.title = 'Older browser title';
const sharedSlide = createSlide('blank');
sharedSlide.elements = [sharedImage];
serverCollision.slides = [sharedSlide];

beforeAll(async () => {
  const db = await openDB('chapter-editor', 1, {
    upgrade(database) {
      const projects = database.createObjectStore('projects', { keyPath: 'id' });
      projects.createIndex('by-updated', 'updatedAt');
      database.createObjectStore('assets');
    },
  });
  await db.put('projects', legacy);
  await db.put('projects', serverCollision);
  // Native blobs survive the structured-clone boundary used by fake IndexedDB.
  await db.put('assets', new NativeBlob(['legacy image'], { type: 'image/png' }), 'legacy asset/#');
  await db.put('assets', new NativeBlob(['shared image'], { type: 'image/jpeg' }), 'shared-asset');
  await db.put('assets', new NativeBlob(['pending image']), 'pending-import');
  db.close();
});

afterEach(() => vi.unstubAllGlobals());

describe('project repository', () => {
  it('retries failed legacy migration without overwriting server data or losing browser recovery data', async () => {
    let failMigration = true;
    const serverProjects = new Map([[serverCollision.id, { ...serverCollision, title: 'Newer server title' }]]);
    const serverAssets = new Map([['legacy asset/#', 'Newer server image']]);
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (init?.method === 'PUT') {
        const id = decodeURIComponent(url.slice(url.lastIndexOf('/') + 1));
        const createOnly = new Headers(init.headers).get('If-None-Match') === '*';
        if (url.startsWith('/api/assets/')) {
          if (createOnly && serverAssets.has(id)) return new Response(null, { status: 412 });
          serverAssets.set(id, await (init.body as NativeBlob).text());
          return new Response(null, { status: 204 });
        }
        if (id === legacy.id && failMigration) {
          return new Response(JSON.stringify({ detail: 'Import blocked' }), { status: 503 });
        }
        if (createOnly && serverProjects.has(id)) return new Response(null, { status: 412 });
        serverProjects.set(id, JSON.parse(init.body as string) as typeof legacy);
        return new Response(null, { status: 204 });
      }
      if (url === '/api/projects/latest/document') return new Response(null, { status: 404 });
      if (url === '/api/projects') return new Response('[]');
      throw new Error(`Unexpected migration request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(listProjects()).rejects.toThrow('Import blocked');
    const db = await openDB('chapter-editor');
    try {
      expect(db.version).toBe(2);
      expect(await db.get('settings', 'folio-api-migration-v1')).toBeUndefined();
      expect(await db.get('projects', legacy.id)).toEqual(legacy);
      expect(await (await db.get('assets', 'legacy asset/#') as NativeBlob).text()).toBe('legacy image');

      failMigration = false;
      await Promise.all([listProjects(), getLastProject()]);
      expect(serverProjects.get(legacy.id)).toEqual(legacy);
      expect(serverProjects.get(serverCollision.id)?.title).toBe('Newer server title');
      expect(serverAssets.get('legacy asset/#')).toBe('Newer server image');
      expect(serverAssets.get('shared-asset')).toBe('shared image');
      expect(serverAssets.has('pending-import')).toBe(false);
      expect(await db.get('settings', 'folio-api-migration-v1')).toBe(true);
      expect(await db.getAll('projects')).toEqual([legacy, serverCollision]);
      expect(await db.getAllKeys('assets')).toEqual(['legacy asset/#', 'pending-import', 'shared-asset']);

      // Completed migration must not resurrect projects deleted on the server.
      serverProjects.delete(legacy.id);
      await listProjects();
      expect(serverProjects.has(legacy.id)).toBe(false);
    } finally {
      db.close();
    }
  });

  it('keeps browser settings local and updatable without an API request', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Settings must not use the API'));
    vi.stubGlobal('fetch', fetchMock);
    await putSetting('editor-preferences', { zoom: 1.25, guides: true, recent: [legacy.id] });
    expect(await getSetting('editor-preferences')).toEqual({ zoom: 1.25, guides: true, recent: [legacy.id] });
    await putSetting('editor-preferences', { zoom: 2 });
    expect(await getSetting('editor-preferences')).toEqual({ zoom: 2 });
    await deleteSetting('editor-preferences');
    expect(await getSetting('editor-preferences')).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns undefined only for missing document and asset GETs, never local project data', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 404, statusText: 'Not Found' })));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getProject(legacy.id)).toBeUndefined();
    expect(await getLastProject()).toBeUndefined();
    expect(await getAsset('missing/asset #1')).toBeUndefined();
    await expect(listProjects()).rejects.toThrow('HTTP 404');
    await expect(saveProject(legacy)).rejects.toThrow('HTTP 404');
    await expect(deleteProject(legacy.id)).rejects.toThrow('HTTP 404');
    await expect(putAsset('missing-asset', new Blob(['image']))).rejects.toThrow('HTTP 404');
  });

  it('surfaces ProblemDetails detail, title, and non-JSON HTTP failures without local fallback', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'Database is unavailable', title: 'Server error' }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ title: 'Library is unavailable' }), { status: 500 }))
      .mockResolvedValueOnce(new Response('Proxy unavailable', { status: 502, statusText: 'Bad Gateway' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(getProject(legacy.id)).rejects.toThrow('Database is unavailable');
    await expect(listProjects()).rejects.toThrow('Library is unavailable');
    await expect(saveProject(legacy)).rejects.toThrow(/HTTP 502/);
  });

  it('reports network failures with backend guidance and the failed operation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(getLastProject()).rejects.toThrow('Cannot reach the Folio API. Start the backend and try again');
    await expect(putAsset('image', new Blob(['image']))).rejects.toThrow('PUT /api/assets/image');
  });

  it('leaves embedded and external image references unchanged without looking them up through the API', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('External references must not reach the API'));
    vi.stubGlobal('fetch', fetchMock);
    for (const reference of ['data:image/png;base64,image', 'blob:https://folio.local/image', 'https://example.com/image.png', 'http://example.com/image.png', '//example.com/image.png']) {
      expect(assetUrl(reference)).toBe(reference);
      expect(await getAsset(reference)).toBeUndefined();
    }
    expect(assetUrl('image /#1')).toBe('/api/assets/image%20%2F%231');
    expect(fetchMock).not.toHaveBeenCalled();
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
});
