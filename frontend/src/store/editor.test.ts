import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, createPresentation, createSlide } from '../lib/defaults';
import { useEditor } from './editor';
import { getLastProject, getProject, saveProject } from '../features/persistence/repository';
import type { Slide, SlideElement } from '../types/model';

vi.mock('../features/persistence/repository', () => ({ getProject: vi.fn(), getLastProject: vi.fn(), saveProject: vi.fn().mockResolvedValue(undefined) }));

function activeSlide(): Slide {
  const state = useEditor.getState();
  const slide = state.document.slides.find(item => item.id === state.activeSlideId);
  if (!slide) throw new Error('Expected an active slide in test presentation');
  return slide;
}

function firstElement(): SlideElement {
  const element = activeSlide().elements[0];
  if (!element) throw new Error('Expected an element in test slide');
  return element;
}

beforeEach(() => {
  vi.clearAllMocks();
  useEditor.getState().cancelTransaction();
  useEditor.getState().setDocument(createPresentation());
});

describe('editor patch history', () => {
  it('undoes and redoes a title mutation', () => {
    const original = useEditor.getState().document.title;
    useEditor.getState().mutate('Rename', draft => { draft.title = 'A different chapter'; });
    expect(useEditor.getState().past.at(-1)?.label).toBe('Rename');
    useEditor.getState().undo();
    expect(useEditor.getState().document.title).toBe(original);
    useEditor.getState().redo();
    expect(useEditor.getState().document.title).toBe('A different chapter');
  });

  it('does not create history for a no-op recipe', () => {
    const original = useEditor.getState().document;
    useEditor.getState().mutate('No change', draft => { draft.title = original.title; });
    expect(useEditor.getState().past).toHaveLength(0);
    expect(useEditor.getState().document).toBe(original);
  });

  it('caps the undo stack at 200 entries', () => {
    for (let i = 0; i < 205; i++) useEditor.getState().mutate('Rename', draft => { draft.title = `Chapter ${i}`; });
    expect(useEditor.getState().past).toHaveLength(200);
    for (let i = 0; i < 200; i++) useEditor.getState().undo();
    expect(useEditor.getState().document.title).toBe('Chapter 4');
  });

  it('clears the redo branch after a new mutation', () => {
    useEditor.getState().mutate('First', draft => { draft.title = 'First'; });
    useEditor.getState().undo();
    expect(useEditor.getState().future).toHaveLength(1);
    useEditor.getState().mutate('Second', draft => { draft.title = 'Second'; });
    expect(useEditor.getState().future).toHaveLength(0);
    useEditor.getState().redo();
    expect(useEditor.getState().document.title).toBe('Second');
  });

  it('coalesces a gesture into one reversible entry', () => {
    const state = useEditor.getState(), element = firstElement();
    state.select([element.id]);
    state.beginTransaction('Move element');
    state.updateElement(element.id, { x: element.x + 10 });
    state.updateElement(element.id, { x: element.x + 20 });
    state.updateElement(element.id, { x: element.x + 30 });
    expect(useEditor.getState().past).toHaveLength(0);
    useEditor.getState().commitTransaction();
    expect(useEditor.getState().past).toHaveLength(1);
    useEditor.getState().undo();
    expect(firstElement().x).toBe(element.x);
    expect(useEditor.getState().selection).toEqual([element.id]);
    useEditor.getState().redo();
    expect(firstElement().x).toBe(element.x + 30);
  });

  it('cancels a gesture without discarding redo history', () => {
    const state = useEditor.getState();
    state.mutate('Rename', draft => { draft.title = 'New name'; });
    state.undo();
    const original = useEditor.getState().document;
    state.beginTransaction('Cancelled edit');
    state.mutate('Rename', draft => { draft.title = 'Not retained'; });
    state.cancelTransaction();
    expect(useEditor.getState().document).toBe(original);
    expect(useEditor.getState().past).toHaveLength(0);
    expect(useEditor.getState().future).toHaveLength(1);
    state.redo();
    expect(useEditor.getState().document.title).toBe('New name');
  });

  it('restores active slide and selection across adding a slide', () => {
    const state = useEditor.getState(), first = activeSlide(), element = firstElement();
    state.select([element.id]);
    state.addSlide('title-content');
    const addedId = useEditor.getState().activeSlideId;
    expect(addedId).not.toBe(first.id);
    state.undo();
    expect(useEditor.getState().activeSlideId).toBe(first.id);
    expect(useEditor.getState().selection).toEqual([element.id]);
    expect(useEditor.getState().document.slides).toHaveLength(6);
    state.redo();
    expect(useEditor.getState().activeSlideId).toBe(addedId);
    expect(useEditor.getState().selection).toEqual([]);
    expect(useEditor.getState().document.slides).toHaveLength(7);
  });

  it('restores deleted selection and selects duplicated objects on redo', () => {
    const state = useEditor.getState(), originalId = firstElement().id;
    state.select([originalId]);
    state.deleteSelection();
    expect(useEditor.getState().selection).toEqual([]);
    state.undo();
    expect(useEditor.getState().selection).toEqual([originalId]);
    state.duplicateSelection();
    const duplicateIds = [...useEditor.getState().selection];
    expect(duplicateIds).toHaveLength(1);
    expect(duplicateIds[0]).not.toBe(originalId);
    state.undo();
    expect(useEditor.getState().selection).toEqual([originalId]);
    state.redo();
    expect(useEditor.getState().selection).toEqual(duplicateIds);
  });
});

describe('element locking', () => {
  it('locks and unlocks a layer through element updates with reversible history', () => {
    const state = useEditor.getState(), element = firstElement();
    state.updateElement(element.id, { locked: true });
    expect(firstElement().locked).toBe(true);
    state.updateElement(element.id, { locked: false });
    expect(firstElement().locked).toBe(false);
    expect(useEditor.getState().past).toHaveLength(2);
    state.undo();
    expect(firstElement().locked).toBe(true);
    state.redo();
    expect(firstElement().locked).toBe(false);
    state.updateElement(element.id, { x: element.x + 10 });
    expect(firstElement().x).toBe(element.x + 10);
  });

  it('protects locked geometry and other properties even when an update unlocks the layer', () => {
    const state = useEditor.getState(), element = firstElement();
    const patch = { x: element.x + 10, y: element.y + 20, width: element.width + 30, height: element.height + 40, rotation: element.rotation + 45, name: 'Changed layer', hidden: !element.hidden };
    state.updateElement(element.id, { locked: true });
    state.updateElement(element.id, patch);
    expect(firstElement()).toEqual({ ...element, locked: true });
    expect(useEditor.getState().past).toHaveLength(1);
    state.updateElement(element.id, { ...patch, locked: false });
    expect(firstElement()).toEqual({ ...element, locked: false });
    expect(useEditor.getState().past).toHaveLength(2);
  });
});

describe('selection transforms', () => {
  it('pastes in place with new nested IDs and reversible selection', () => {
    const table = createElement('table');
    table.x = 120; table.y = 240; table.groupId = 'source-group';
    table.animations = [{ id: 'animation', category: 'entrance', effect: 'fadeIn', trigger: 'onClick', duration: 1, delay: 0 }];
    const companion = createElement('shape');
    companion.groupId = table.groupId;
    const document = createPresentation(), slide = createSlide();
    slide.elements = [table, companion]; document.slides = [slide];
    const state = useEditor.getState();
    state.setDocument(document); state.select([table.id, companion.id]); state.copySelection();
    state.pasteClipboard('in-place');
    const pasted = activeSlide().elements.slice(2), copy = pasted[0], shape = pasted[1];
    if (!copy || copy.type !== 'table' || !shape) throw new Error('Expected pasted table and shape');
    expect(copy.id).not.toBe(table.id);
    expect([copy.x, copy.y]).toEqual([table.x, table.y]);
    expect(copy.groupId).not.toBe(table.groupId);
    expect(copy.groupId).toBe(shape.groupId);
    expect(copy.animations[0]?.id).not.toBe(table.animations[0]?.id);
    expect(copy.rows[0]?.id).not.toBe(table.rows[0]?.id);
    expect(copy.rows[0]?.cells[0]?.id).not.toBe(table.rows[0]?.cells[0]?.id);
    const pastedIds = pasted.map(element => element.id);
    expect(useEditor.getState().selection).toEqual(pastedIds);
    state.undo();
    expect(activeSlide().elements).toHaveLength(2);
    expect(useEditor.getState().selection).toEqual([table.id, companion.id]);
    state.redo();
    expect(useEditor.getState().selection).toEqual(pastedIds);
  });

  it('anchors pasted selection bounds at supplied coordinates while preserving spacing', () => {
    const left = { ...createElement('shape'), x: 100, y: 300 };
    const right = { ...createElement('shape'), x: 500, y: 100 };
    const document = createPresentation(), slide = createSlide();
    slide.elements = [left, right]; document.slides = [slide];
    const state = useEditor.getState();
    state.setDocument(document); state.select([left.id, right.id]); state.copySelection();
    state.pasteClipboard({ x: 40, y: 80 });
    expect(activeSlide().elements.slice(2).map(element => [element.x, element.y])).toEqual([[40, 280], [440, 80]]);
    state.undo(); state.pasteClipboard();
    expect(activeSlide().elements.slice(2).map(element => [element.x, element.y])).toEqual([[132, 332], [532, 132]]);
  });

  it('distributes variable widths with equal gaps, fixed extremes and untouched locked objects', () => {
    const left = { ...createElement('shape'), x: 10, width: 50 };
    const middle = { ...createElement('shape'), x: 80, width: 100 };
    const right = { ...createElement('shape'), x: 310, width: 50 };
    const locked = { ...createElement('shape'), x: 130, width: 90, locked: true };
    const document = createPresentation(), slide = createSlide();
    slide.elements = [middle, right, locked, left]; document.slides = [slide];
    const state = useEditor.getState();
    state.setDocument(document); state.select(slide.elements.map(element => element.id)); state.distribute('horizontal');
    expect(activeSlide().elements.map(element => element.x)).toEqual([135, 310, 130, 10]);
    expect(useEditor.getState().past).toHaveLength(1);
    state.undo();
    expect(activeSlide().elements.map(element => element.x)).toEqual([80, 310, 130, 10]);
    state.redo();
    expect(activeSlide().elements[0]?.x).toBe(135);
  });

  it('matches the first selected unlocked reference, preserving other dimensions and locked objects', () => {
    const first = { ...createElement('shape'), width: 100, height: 50 };
    const reference = { ...createElement('shape'), width: 240, height: 90 };
    const locked = { ...createElement('shape'), width: 330, height: 140, locked: true };
    const document = createPresentation(), slide = createSlide();
    slide.elements = [first, reference, locked]; document.slides = [slide];
    const state = useEditor.getState();
    state.setDocument(document); state.select([locked.id, reference.id, first.id]); state.matchSize('width');
    expect(activeSlide().elements.map(element => [element.width, element.height])).toEqual([[240, 50], [240, 90], [330, 140]]);
    state.undo(); state.matchSize('both');
    expect(activeSlide().elements.map(element => [element.width, element.height])).toEqual([[240, 90], [240, 90], [330, 140]]);
  });

  it('flips only supported unlocked elements and supports undo', () => {
    const shape = createElement('shape'), image = createElement('image'), text = createElement('text');
    image.locked = true;
    const document = createPresentation(), slide = createSlide();
    slide.elements = [shape, image, text]; document.slides = [slide];
    const state = useEditor.getState();
    state.setDocument(document); state.select(slide.elements.map(element => element.id)); state.flip('horizontal');
    const flipped = firstElement();
    if (flipped.type !== 'shape') throw new Error('Expected flipped shape');
    expect(flipped.flipH).toBe(true); expect(flipped.flipV).toBe(false);
    expect(activeSlide().elements[1]).toEqual(image);
    expect(activeSlide().elements[2]).toEqual(text);
    state.undo(); expect(firstElement()).toEqual(shape);
  });
});

describe('project lifecycle', () => {
  it('ignores an older project load when a newer one completes first', async () => {
    const older = createPresentation(), newer = createPresentation();
    const pending = Promise.withResolvers<typeof older | undefined>();
    vi.mocked(getProject).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(newer);
    const state = useEditor.getState(), loadingOlder = state.loadProject(older.id);
    await state.loadProject(newer.id);
    pending.resolve(older); await loadingOlder;
    expect(useEditor.getState().document.id).toBe(newer.id);
    expect(useEditor.getState().saveStatus).toBe('Saved');
  });

  it('does not restore a previous project over local edits', async () => {
    const previous = createPresentation();
    const pending = Promise.withResolvers<typeof previous | undefined>();
    vi.mocked(getLastProject).mockReturnValueOnce(pending.promise);
    const state = useEditor.getState(), restoring = state.restoreProject();
    state.mutate('Rename', draft => { draft.title = 'Keep my changes'; });
    pending.resolve(previous); await restoring;
    expect(useEditor.getState().document.title).toBe('Keep my changes');
  });

  it('keeps newer edits unsaved when an older snapshot finishes saving', async () => {
    const pending = Promise.withResolvers<undefined>();
    vi.mocked(saveProject).mockReturnValueOnce(pending.promise);
    const state = useEditor.getState(), snapshot = state.document;
    const saving = state.saveProject();
    state.mutate('Rename', draft => { draft.title = 'Unsaved newer title'; });
    pending.resolve(undefined); await saving;
    expect(saveProject).toHaveBeenCalledWith(snapshot);
    expect(useEditor.getState().saveStatus).toBe('Unsaved');
  });

  it('reports a failed save and allows the serialized queue to recover', async () => {
    vi.mocked(saveProject).mockRejectedValueOnce(new Error('Storage full'));
    const state = useEditor.getState();
    await expect(state.saveProject()).rejects.toThrow('Storage full');
    expect(useEditor.getState().saveStatus).toBe('Save failed');
    await state.saveProject();
    expect(useEditor.getState().saveStatus).toBe('Saved');
  });
});
