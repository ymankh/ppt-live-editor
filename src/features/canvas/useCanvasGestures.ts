import { useRef, useState, type PointerEvent, type RefObject } from 'react';
import { useEditor } from '@/store/editor';
import { useView } from '@/store/view';
import { createElement } from '@/lib/defaults';
import type { Point, ShapeKind, SlideElement } from '@/types/model';
import { boxCenter, intersects, resizeBox, rotatePoint, rotatedBounds, rotationFromPointer, selectionBounds, snapTranslation, type Box, type ResizeHandle, type SnapGuide } from '@/lib/geometry';
import { strings } from "@/strings";


type Gesture = {
  kind: 'move' | 'resize' | 'rotate' | 'marquee' | 'pan' | 'draw';
  pointerId: number;
  container: HTMLElement;
  slideId: string;
  start: Point;
  screenStart: Point;
  initial: SlideElement[];
  bounds: Box | null;
  targets: Box[];
  handle?: ResizeHandle;
  drawing?: SlideElement;
  duplicate: boolean;
  additive: string[];
  panStart: Point;
};
const shapeTools: Record<string, ShapeKind> = {
  rect: strings.common.rect, roundRect: strings.common.roundRect, ellipse: strings.common.ellipse, triangle: strings.common.triangle,
  rightTriangle: strings.common.rightTriangle, diamond: strings.common.diamond, pentagon: strings.common.pentagon,
  hexagon: strings.common.hexagon, octagon: strings.common.octagon, star5: strings.common.star5, star6: strings.common.star6,
  arrowRight: strings.common.arrowRight, arrowLeft: strings.common.arrowLeft, arrowUp: strings.common.arrowUp,
  arrowDown: strings.common.arrowDown, arrowDouble: strings.common.arrowDouble, chevron: strings.common.chevron,
  parallelogram: strings.common.parallelogram, trapezoid: strings.common.trapezoid, plus: strings.common.plus,
  heart: strings.common.heart, cloud: strings.common.cloud, calloutRect: strings.common.calloutRect, calloutEllipse: strings.common.calloutEllipse,
};
function drawingElement(tool: string): SlideElement | undefined {
  if (tool === strings.common.text) return createElement(strings.common.text);
  if (tool === strings.common.line || tool === strings.common.arrow) {
    const line = createElement(strings.common.line);
    if (tool === strings.common.arrow) line.endArrow = strings.common.arrow;
    return line;
  }
  const name = tool === strings.common.shape || tool === strings.common.rectangle ? strings.common.rect : tool.replace(/^shape:/, strings.common.empty);
  const shape = Object.hasOwn(shapeTools, name) ? shapeTools[name] : undefined;
  return shape ? createElement(strings.common.shape, shape) : undefined;
}
export function withGeometry(element: SlideElement, box: Box): SlideElement {
  if (element.type === strings.common.line) return { ...element, ...box, start: { x: element.width ? element.start.x * box.width / element.width : 0, y: element.height ? element.start.y * box.height / element.height : 0 }, end: { x: element.width ? element.end.x * box.width / element.width : box.width, y: element.height ? element.end.y * box.height / element.height : box.height } };
  return { ...element, ...box };
}
function drawnElement(element: SlideElement, start: Point, end: Point, constrain: boolean): SlideElement {
  let dx = end.x - start.x, dy = end.y - start.y;
  if (constrain) {
    if (element.type === strings.common.line) {
      const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI / 4;
      const length = Math.hypot(dx, dy);
      dx = Math.cos(angle) * length; dy = Math.sin(angle) * length;
    } else {
      const length = Math.max(Math.abs(dx), Math.abs(dy));
      dx = (dx < 0 ? -1 : 1) * length; dy = (dy < 0 ? -1 : 1) * length;
    }
  }
  const x = Math.min(start.x, start.x + dx), y = Math.min(start.y, start.y + dy);
  const width = Math.abs(dx), height = Math.abs(dy);
  if (element.type === strings.common.line) return { ...element, x, y, width, height, start: { x: start.x - x, y: start.y - y }, end: { x: start.x + dx - x, y: start.y + dy - y } };
  return { ...element, x, y, width: Math.max(8, width), height: Math.max(8, height) };
}
export function useCanvasGestures(slideElements: SlideElement[], scale: number, frame: RefObject<HTMLDivElement | null>, spacePan = false) {
  const [transient, setTransient] = useState<Record<string, Box>>({});
  const [previews, setPreviews] = useState<SlideElement[]>([]);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const latest = useRef<Record<string, Box>>({});
  const latestDrawing = useRef<SlideElement | null>(null);
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const point = (event: PointerEvent<HTMLElement>): Point => {
    const rect = frame.current?.getBoundingClientRect();
    return { x: (event.clientX - (rect?.left ?? 0)) / scale, y: (event.clientY - (rect?.top ?? 0)) / scale };
  };
  const begin = (event: PointerEvent<HTMLElement>, kind?: 'resize' | 'rotate', handle?: ResizeHandle, workspace?: HTMLDivElement) => {
    if (event.button !== 0 || gesture.current || (event.target as HTMLElement).closest(strings.canvas.dataEditingTrue)) return;
    const container = workspace ?? event.currentTarget;
    const state = useEditor.getState();
    const id = (event.target as HTMLElement).closest(strings.canvas.dataElementId)?.getAttribute(strings.canvas.dataElementId_47547373);
    const target = slideElements.find(element => element.id === id);
    const start = point(event);
    let selected = state.selection;
    let action: Gesture['kind'] = kind ?? strings.canvas.marquee;
    const drawing = kind ? undefined : drawingElement(state.tool);
    if (spacePan || state.tool === strings.canvas.hand || state.tool === strings.canvas.pan) action = strings.canvas.pan;
    else if (drawing) {
      if (start.x < 0 || start.y < 0 || start.x > state.document.slideSize.width || start.y > state.document.slideSize.height) return;
      action = strings.canvas.draw; selected = []; state.select([]);
      setPreviews([drawnElement(drawing, start, start, false)]);
    } else if (!kind && target && !target.locked) {
      const ids = target.groupId ? slideElements.filter(e => e.groupId === target.groupId && !e.locked && !e.hidden).map(e => e.id) : [target.id];
      if (event.shiftKey) {
        selected = ids.every(value => selected.includes(value)) ? selected.filter(value => !ids.includes(value)) : [...new Set([...selected, ...ids])];
      } else if (!selected.includes(target.id)) selected = ids;
      state.select(selected);
      action = strings.canvas.move;
    } else if (!kind && !event.shiftKey) { selected = []; state.select([]); }
    const initial = slideElements.filter(element => selected.includes(element.id) && !element.locked && !element.hidden);
    const targets = [{ x: 0, y: 0, width: state.document.slideSize.width, height: state.document.slideSize.height, rotation: 0 }, ...slideElements.filter(element => !selected.includes(element.id) && !element.hidden).map(rotatedBounds)];
    gesture.current = { kind: action, pointerId: event.pointerId, container, panStart: panOffset, slideId: state.activeSlideId, start, screenStart: { x: event.clientX, y: event.clientY }, initial, bounds: selectionBounds(initial), targets, ...(handle ? { handle } : {}), ...(drawing ? { drawing } : {}), duplicate: action === strings.canvas.move && event.altKey, additive: event.shiftKey ? selected : [] };
    latest.current = {}; latestDrawing.current = null;
    if (action === strings.canvas.draw || action === strings.canvas.marquee || action === strings.canvas.pan) container.setPointerCapture(event.pointerId);
    container.focus({ preventScroll: true });
    event.preventDefault();
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const p = point(event), delta = { x: p.x - current.start.x, y: p.y - current.start.y };
    if (current.kind === strings.canvas.pan) {
      setPanOffset({
        x: current.panStart.x + event.clientX - current.screenStart.x,
        y: current.panStart.y + event.clientY - current.screenStart.y,
      });
      return;
    }
    if (current.kind === strings.canvas.marquee) {
      setMarquee({ x: Math.min(p.x, current.start.x), y: Math.min(p.y, current.start.y), width: Math.abs(delta.x), height: Math.abs(delta.y), rotation: 0 });
      return;
    }
    if (Math.hypot(delta.x, delta.y) * scale < 2 && !Object.keys(latest.current).length && !latestDrawing.current) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    const view = useView.getState();
    const snapping = view.snap && !event.altKey;
    const spacing = view.grid ? view.gridSpacing : null;
    if (current.kind === strings.canvas.draw && current.drawing) {
      const snapped = snapping ? snapTranslation({ ...p, width: 0, height: 0, rotation: 0 }, { x: 0, y: 0 }, current.targets, spacing, 5 / scale) : { delta: { x: 0, y: 0 }, guides: [] };
      const drawn = drawnElement(current.drawing, current.start, { x: p.x + snapped.delta.x, y: p.y + snapped.delta.y }, event.shiftKey);
      latestDrawing.current = drawn; setPreviews([drawn]); setGuides(snapped.guides);
      return;
    }
    const next: Record<string, Box> = {};
    const bounds = current.bounds;
    if (!bounds) return;
    let nextGuides: SnapGuide[] = [];
    if (current.kind === strings.canvas.move) {
      const constrainX = event.shiftKey && Math.abs(delta.y) > Math.abs(delta.x);
      const constrainY = event.shiftKey && !constrainX;
      const movement = { x: constrainX ? 0 : delta.x, y: constrainY ? 0 : delta.y };
      const snapped = snapping ? snapTranslation(bounds, movement, current.targets, spacing, 5 / scale) : { delta: movement, guides: [] };
      const dx = constrainX ? 0 : snapped.delta.x, dy = constrainY ? 0 : snapped.delta.y;
      nextGuides = snapped.guides.filter(guide => !(guide.axis === strings.common.x ? constrainX : constrainY));
      for (const element of current.initial) next[element.id] = { x: element.x + dx, y: element.y + dy, width: element.width, height: element.height, rotation: element.rotation };
    } else if (current.kind === strings.common.resize && current.handle) {
      const box = resizeBox(bounds, current.handle, delta, event.shiftKey);
      const first = current.initial[0];
      if (current.initial.length === 1 && first) next[first.id] = box;
      else for (const element of current.initial) next[element.id] = { x: box.x + (element.x - bounds.x) * box.width / Math.max(1, bounds.width), y: box.y + (element.y - bounds.y) * box.height / Math.max(1, bounds.height), width: element.width * box.width / Math.max(1, bounds.width), height: element.height * box.height / Math.max(1, bounds.height), rotation: element.rotation };
    } else if (current.kind === strings.canvas.rotate) {
      const center = boxCenter(bounds);
      const angle = rotationFromPointer(center, current.start, p, bounds.rotation, event.shiftKey);
      const difference = angle - bounds.rotation;
      for (const element of current.initial) {
        const moved = rotatePoint(boxCenter(element), center, difference);
        next[element.id] = { x: moved.x - element.width / 2, y: moved.y - element.height / 2, width: element.width, height: element.height, rotation: current.initial.length === 1 ? angle : element.rotation + difference };
      }
    }
    latest.current = next;
    if (current.duplicate) {
      setPreviews(current.initial.map(element => {
        const box = next[element.id];
        return { ...(box ? withGeometry(element, box) : element), id: `${strings.canvas.preview}${element.id}` };
      }));
    } else setTransient(next);
    setGuides(nextGuides);
  };
  const clear = () => {
    const current = gesture.current;
    gesture.current = null; latest.current = {}; latestDrawing.current = null;
    setTransient({}); setPreviews([]); setGuides([]); setMarquee(null);
    if (current?.container.hasPointerCapture(current.pointerId)) current.container.releasePointerCapture(current.pointerId);
  };
  const end = (event: PointerEvent<HTMLDivElement>, cancel = false) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const state = useEditor.getState();
    const commit = !cancel && state.activeSlideId === current.slideId;
    if (commit && current.kind === strings.canvas.draw && current.drawing) {
      const element = latestDrawing.current ?? { ...current.drawing, x: current.start.x, y: current.start.y };
      const ownsTransaction = !state.transaction;
      if (ownsTransaction) state.beginTransaction(`${strings.canvas.draw_9f0ab7e3}${element.type}`);
      state.mutate(`${strings.canvas.draw_9f0ab7e3}${element.type}`, draft => { draft.slides.find(slide => slide.id === current.slideId)?.elements.push(element); });
      state.select([element.id]); state.setTool(strings.common.select);
      if (ownsTransaction) state.commitTransaction();
    } else if (commit && current.kind === strings.canvas.marquee) {
      const p = point(event);
      const box = { x: Math.min(p.x, current.start.x), y: Math.min(p.y, current.start.y), width: Math.abs(p.x - current.start.x), height: Math.abs(p.y - current.start.y) };
      if (box.width > 3 / scale || box.height > 3 / scale) state.select([...new Set([...current.additive, ...slideElements.filter(element => !element.locked && !element.hidden && intersects(box, rotatedBounds(element))).map(element => element.id)])]);
    } else if (commit && Object.keys(latest.current).length) {
      let patches = latest.current;
      const label = current.duplicate ? strings.canvas.duplicateAndMoveElements : current.kind === strings.canvas.rotate ? strings.canvas.rotateElements : current.kind === strings.common.resize ? strings.canvas.resizeElements : strings.canvas.moveElements;
      const ownsTransaction = current.duplicate && !state.transaction;
      if (ownsTransaction) state.beginTransaction(label);
      if (current.duplicate) {
        state.select(current.initial.map(element => element.id));
        state.duplicateSelection();
        const updated = useEditor.getState();
        const clones = updated.document.slides.find(slide => slide.id === current.slideId)?.elements.filter(element => updated.selection.includes(element.id)) ?? [];
        patches = {};
        clones.forEach((element, index) => {
          const source = current.initial[index];
          const box = source ? latest.current[source.id] : undefined;
          if (box) patches[element.id] = box;
        });
      }
      state.mutate(label, draft => {
        const slide = draft.slides.find(s => s.id === current.slideId);
        if (slide) slide.elements = slide.elements.map(element => {
          const box = patches[element.id];
          return box ? withGeometry(element, box) : element;
        });
      });
      if (ownsTransaction) state.commitTransaction();
    }
    clear();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return { transient, previews, duplicate: gesture.current?.duplicate ?? false, guides, marquee, panOffset, resetPan: () => setPanOffset({ x: 0, y: 0 }), begin, move, end, cancel: clear };
}
