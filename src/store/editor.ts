import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { applyPatches, enablePatches, produce, produceWithPatches, type Patch } from 'immer';
import { nanoid } from 'nanoid';
import { createElement, createPresentation, createSlide } from '../lib/defaults';
import { getLastProject, getProject, saveProject as persistProject } from '../features/persistence/repository';
import type { ElementType, Point, Presentation, ShapeKind, SlideElement } from '../types/model';

enablePatches();
export interface HistoryEntry {
  label: string;
  patches: Patch[];
  inverse: Patch[];
  beforeSelection: string[];
  afterSelection: string[];
  beforeSlide: string;
  afterSlide: string;
}
export interface EditorTransaction extends HistoryEntry {
  originalDocument: Presentation;
  originalFuture: HistoryEntry[];
  originalSaveStatus: string;
}
export type ArrangeOperation = 'front' | 'back' | 'forward' | 'backward' | 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export interface EditorState {
  document: Presentation;
  activeSlideId: string;
  selection: string[];
  zoom: number;
  tool: string;
  saveStatus: string;
  past: HistoryEntry[];
  future: HistoryEntry[];
  transaction: EditorTransaction | null;
  mutate: (label: string, recipe: (draft: Presentation) => void) => void;
  select: (ids: string[]) => void;
  setActiveSlide: (id: string) => void;
  setZoom: (zoom: number) => void;
  setTool: (tool: string) => void;
  undo: () => void;
  redo: () => void;
  addSlide: (layout?: string) => void;
  insert: (type: ElementType, shape?: ShapeKind) => void;
  updateElement: (id: string, patch: Partial<SlideElement>) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: (position?: Point | 'in-place') => void;
  arrange: (operation: ArrangeOperation) => void;
  distribute: (axis: 'horizontal' | 'vertical') => void;
  matchSize: (dimension: 'width' | 'height' | 'both') => void;
  flip: (axis: 'horizontal' | 'vertical') => void;
  beginTransaction: (label: string) => void;
  commitTransaction: () => void;
  cancelTransaction: () => void;
  loadProject: (id: string) => Promise<void>;
  restoreProject: () => Promise<void>;
  setDocument: (document: Presentation) => void;
  newProject: () => void;
  saveProject: () => Promise<void>;
}
let clipboard: SlideElement[] = [];
let saveTimer: number | undefined;
let saveQueue: Promise<void> = Promise.resolve();
let loadVersion = 0;
const initial = createPresentation();

function clonedElements(elements: SlideElement[], offset: Point = { x: 32, y: 32 }): SlideElement[] {
  const groups = new Map<string, string>();
  return elements.map(source => {
    const element = structuredClone(source);
    element.id = nanoid(); element.x += offset.x; element.y += offset.y;
    if (element.groupId) {
      const groupId = groups.get(element.groupId) ?? nanoid();
      groups.set(element.groupId, groupId);
      element.groupId = groupId;
    }
    element.animations.forEach(animation => { animation.id = nanoid(); });
    if (element.type === 'table') element.rows.forEach(row => { row.id = nanoid(); row.cells.forEach(cell => { cell.id = nanoid(); }); });
    if (element.type === 'chart') element.series.forEach(series => { series.id = nanoid(); });
    return element;
  });
}

export const useEditor = create<EditorState>()(immer((set, get) => ({
  document: initial, activeSlideId: initial.slides[0]?.id ?? '', selection: [], zoom: 1, tool: 'select', saveStatus: 'Saved', past: [], future: [], transaction: null,
  mutate(label, recipe) {
    const state = get();
    const [document, patches, inverse] = produceWithPatches(state.document, recipe);
    if (!patches.length) return;
    const updated = produce(document, draft => { draft.updatedAt = new Date().toISOString(); });
    const activeSlideId = updated.slides.some(slide => slide.id === state.activeSlideId) ? state.activeSlideId : updated.slides[0]?.id ?? '';
    const selectedSlide = updated.slides.find(slide => slide.id === activeSlideId);
    const selection = state.selection.filter(id => selectedSlide?.elements.some(element => element.id === id));
    const entry: HistoryEntry = { label, patches, inverse, beforeSelection: [...state.selection], afterSelection: selection, beforeSlide: state.activeSlideId, afterSlide: activeSlideId };
    if (state.transaction) {
      set({ document: updated, activeSlideId, selection, saveStatus: 'Unsaved', future: [], transaction: { ...state.transaction, patches: [...state.transaction.patches, ...patches], inverse: [...inverse, ...state.transaction.inverse], afterSelection: selection, afterSlide: activeSlideId } });
    } else set({ document: updated, activeSlideId, selection, saveStatus: 'Unsaved', past: [...state.past, entry].slice(-200), future: [] });
  },
  select(ids) {
    const slide = get().document.slides.find(item => item.id === get().activeSlideId);
    set({ selection: [...new Set(ids)].filter(id => slide?.elements.some(element => element.id === id && !element.hidden)) });
  },
  setActiveSlide(id) { if (get().document.slides.some(slide => slide.id === id)) set({ activeSlideId: id, selection: [] }); },
  setZoom(zoom) { set({ zoom: Math.max(0.1, Math.min(4, zoom)) }); },
  setTool(tool) { set({ tool }); },
  beginTransaction(label) {
    const state = get();
    if (state.transaction) return;
    set({ transaction: { label, patches: [], inverse: [], beforeSelection: [...state.selection], afterSelection: [...state.selection], beforeSlide: state.activeSlideId, afterSlide: state.activeSlideId, originalDocument: state.document, originalFuture: state.future, originalSaveStatus: state.saveStatus } });
  },
  commitTransaction() {
    const state = get(), transaction = state.transaction;
    if (!transaction) return;
    const entry: HistoryEntry = { label: transaction.label, patches: transaction.patches, inverse: transaction.inverse, beforeSelection: transaction.beforeSelection, beforeSlide: transaction.beforeSlide, afterSelection: [...state.selection], afterSlide: state.activeSlideId };
    set({ transaction: null, past: entry.patches.length ? [...state.past, entry].slice(-200) : state.past });
  },
  cancelTransaction() {
    const state = get(), transaction = state.transaction;
    if (!transaction) return;
    set({ document: transaction.originalDocument, activeSlideId: transaction.beforeSlide, selection: transaction.beforeSelection, future: transaction.originalFuture, transaction: null, saveStatus: transaction.originalSaveStatus });
  },
  undo() {
    get().commitTransaction();
    const state = get(), entry = state.past.at(-1);
    if (!entry) return;
    const document = produce(applyPatches(state.document, entry.inverse), draft => { draft.updatedAt = new Date().toISOString(); });
    set({ document, activeSlideId: entry.beforeSlide, selection: entry.beforeSelection, past: state.past.slice(0, -1), future: [...state.future, entry], saveStatus: 'Unsaved' });
  },
  redo() {
    get().commitTransaction();
    const state = get(), entry = state.future.at(-1);
    if (!entry) return;
    const document = produce(applyPatches(state.document, entry.patches), draft => { draft.updatedAt = new Date().toISOString(); });
    set({ document, activeSlideId: entry.afterSlide, selection: entry.afterSelection, past: [...state.past, entry].slice(-200), future: state.future.slice(0, -1), saveStatus: 'Unsaved' });
  },
  addSlide(layout = 'blank') {
    const state = get(), slide = createSlide(layout);
    const ownsTransaction = !state.transaction;
    if (ownsTransaction) state.beginTransaction('Add slide');
    state.mutate('Add slide', draft => { const index = draft.slides.findIndex(item => item.id === state.activeSlideId); draft.slides.splice(index + 1, 0, slide); });
    get().setActiveSlide(slide.id);
    if (ownsTransaction) get().commitTransaction();
  },
  insert(type, shape) {
    const state = get(), element = createElement(type, shape), ownsTransaction = !state.transaction;
    if (ownsTransaction) state.beginTransaction(`Insert ${type}`);
    state.mutate(`Insert ${type}`, draft => { draft.slides.find(slide => slide.id === state.activeSlideId)?.elements.push(element); });
    get().select([element.id]); set({ tool: 'select' });
    if (ownsTransaction) get().commitTransaction();
  },
  updateElement(id, patch) {
    get().mutate('Edit element', draft => {
      const element = draft.slides.find(slide => slide.id === get().activeSlideId)?.elements.find(item => item.id === id);
      if (element && !element.locked) Object.assign(element, patch, { id: element.id, type: element.type });
    });
  },
  deleteSelection() {
    const state = get();
    state.mutate('Delete elements', draft => {
      const slide = draft.slides.find(item => item.id === state.activeSlideId);
      if (slide) slide.elements = slide.elements.filter(element => !state.selection.includes(element.id) || element.locked);
    });
  },
  duplicateSelection() {
    const state = get(), source = state.document.slides.find(slide => slide.id === state.activeSlideId)?.elements.filter(element => state.selection.includes(element.id)) ?? [];
    if (!source.length) return;
    const elements = clonedElements(source), ownsTransaction = !state.transaction;
    if (ownsTransaction) state.beginTransaction('Duplicate elements');
    state.mutate('Duplicate elements', draft => { draft.slides.find(slide => slide.id === state.activeSlideId)?.elements.push(...elements); });
    get().select(elements.map(element => element.id));
    if (ownsTransaction) get().commitTransaction();
  },
  copySelection() {
    const state = get();
    clipboard = structuredClone(state.document.slides.find(slide => slide.id === state.activeSlideId)?.elements.filter(element => state.selection.includes(element.id)) ?? []);
    if(navigator.clipboard)void navigator.clipboard.writeText(JSON.stringify({folio:true,elements:clipboard})).catch(()=>{});
  },
  cutSelection() { get().copySelection(); get().deleteSelection(); },
  pasteClipboard(position) {
    if (!clipboard.length) return;
    const offset = position === 'in-place' ? { x: 0, y: 0 } : position ? {
      x: position.x - Math.min(...clipboard.map(element => element.x)),
      y: position.y - Math.min(...clipboard.map(element => element.y)),
    } : undefined;
    const state = get(), elements = clonedElements(clipboard, offset), ownsTransaction = !state.transaction;
    if (ownsTransaction) state.beginTransaction('Paste elements');
    state.mutate('Paste elements', draft => { draft.slides.find(slide => slide.id === state.activeSlideId)?.elements.push(...elements); });
    get().select(elements.map(element => element.id));
    if (ownsTransaction) get().commitTransaction();
  },
  arrange(operation) {
    const state = get();
    state.mutate('Arrange elements', draft => {
      const slide = draft.slides.find(item => item.id === state.activeSlideId);
      if (!slide) return;
      const selected = slide.elements.filter(element => state.selection.includes(element.id) && !element.locked);
      if (!selected.length) return;
      const ids = new Set(selected.map(element => element.id));
      if (operation === 'front' || operation === 'back') {
        const rest = slide.elements.filter(element => !ids.has(element.id));
        slide.elements = operation === 'front' ? [...rest, ...selected] : [...selected, ...rest];
      } else if (operation === 'forward' || operation === 'backward') {
        const direction = operation === 'forward' ? 1 : -1;
        for (let i = direction === 1 ? slide.elements.length - 2 : 1; direction === 1 ? i >= 0 : i < slide.elements.length; i -= direction) {
          const current = slide.elements[i], adjacent = slide.elements[i + direction];
          if (current && adjacent && ids.has(current.id) && !ids.has(adjacent.id)) {
            slide.elements[i] = adjacent;
            slide.elements[i + direction] = current;
          }
        }
      } else {
        const left = selected.length === 1 ? 0 : Math.min(...selected.map(element => element.x));
        const top = selected.length === 1 ? 0 : Math.min(...selected.map(element => element.y));
        const right = selected.length === 1 ? draft.slideSize.width : Math.max(...selected.map(element => element.x + element.width));
        const bottom = selected.length === 1 ? draft.slideSize.height : Math.max(...selected.map(element => element.y + element.height));
        for (const element of selected) {
          if (operation === 'left') element.x = left;
          if (operation === 'center') element.x = (left + right - element.width) / 2;
          if (operation === 'right') element.x = right - element.width;
          if (operation === 'top') element.y = top;
          if (operation === 'middle') element.y = (top + bottom - element.height) / 2;
          if (operation === 'bottom') element.y = bottom - element.height;
        }
      }
    });
  },
  distribute(axis) {
    const state = get(), coordinate = axis === 'horizontal' ? 'x' : 'y', dimension = axis === 'horizontal' ? 'width' : 'height';
    state.mutate('Distribute elements', draft => {
      const selected = draft.slides.find(slide => slide.id === state.activeSlideId)?.elements.filter(element => state.selection.includes(element.id) && !element.locked) ?? [];
      if (selected.length < 3) return;
      selected.sort((a, b) => a[coordinate] - b[coordinate]);
      const first = selected[0], last = selected.at(-1);
      if (!first || !last) return;
      const occupied = selected.reduce((total, element) => total + element[dimension], 0);
      const gap = (last[coordinate] + last[dimension] - first[coordinate] - occupied) / (selected.length - 1);
      let next = first[coordinate] + first[dimension] + gap;
      for (const element of selected.slice(1, -1)) {
        element[coordinate] = next;
        next += element[dimension] + gap;
      }
    });
  },
  matchSize(dimension) {
    const state = get();
    state.mutate('Match element size', draft => {
      const slide = draft.slides.find(item => item.id === state.activeSlideId);
      if (!slide) return;
      const reference = state.selection.map(id => slide.elements.find(element => element.id === id && !element.locked)).find(element => element !== undefined);
      if (!reference) return;
      for (const element of slide.elements) {
        if (!state.selection.includes(element.id) || element.locked) continue;
        if (dimension !== 'height') element.width = reference.width;
        if (dimension !== 'width') element.height = reference.height;
      }
    });
  },
  flip(axis) {
    const state = get(), property = axis === 'horizontal' ? 'flipH' : 'flipV';
    state.mutate('Flip elements', draft => {
      for (const element of draft.slides.find(slide => slide.id === state.activeSlideId)?.elements ?? []) {
        if (state.selection.includes(element.id) && !element.locked && (element.type === 'shape' || element.type === 'image')) element[property] = !element[property];
      }
    });
  },
  async loadProject(id) {
    const version = ++loadVersion;
    const document = await getProject(id);
    if (version !== loadVersion) return;
    if (!document) throw new Error('Presentation not found');
    get().setDocument(document);
    set({ saveStatus: 'Saved' });
  },
  async restoreProject() {
    const snapshot = get().document, version = ++loadVersion;
    const document = await getLastProject();
    if (version !== loadVersion || get().document !== snapshot) return;
    if (document) { get().setDocument(document); set({ saveStatus: 'Saved' }); }
    else await get().saveProject();
  },
  setDocument(document) {
    ++loadVersion;
    get().cancelTransaction();
    get().mutate('Open presentation', draft => { Object.assign(draft, document); });
    set({ activeSlideId: document.slides[0]?.id ?? '', selection: [], past: [], future: [], transaction: null });
  },
  newProject() { get().setDocument(createPresentation()); },
  async saveProject() {
    get().commitTransaction();
    if (saveTimer !== undefined) { window.clearTimeout(saveTimer); saveTimer = undefined; }
    const snapshot = get().document;
    set({ saveStatus: 'Saving' });
    const saving = saveQueue.catch(() => undefined).then(() => persistProject(snapshot));
    saveQueue = saving;
    try {
      await saving;
      if (get().document === snapshot) set({ saveStatus: 'Saved' });
    } catch (error) {
      if (get().document === snapshot) set({ saveStatus: 'Save failed' });
      throw error;
    }
  },
})));

useEditor.subscribe((state, previous) => {
  if (state.document === previous.document && state.transaction === previous.transaction) return;
  if (saveTimer !== undefined) window.clearTimeout(saveTimer);
  if (state.transaction || typeof window === 'undefined') return;
  saveTimer = window.setTimeout(() => { void useEditor.getState().saveProject().catch(() => undefined); }, 650);
});
