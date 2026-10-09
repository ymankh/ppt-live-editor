import type { Point, ShapeKind } from '@/types/model';

export interface Box { x: number; y: number; width: number; height: number; rotation: number }
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
export const resizeHandles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
export const degrees = (radians: number) => radians * 180 / Math.PI;
export const radians = (angle: number) => angle * Math.PI / 180;
export const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;
export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const c = Math.cos(radians(angle)), s = Math.sin(radians(angle));
  const x = point.x - center.x, y = point.y - center.y;
  return { x: center.x + x * c - y * s, y: center.y + x * s + y * c };
}
export const boxCenter = (box: Box): Point => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
export function rotatedBounds(box: Box): Box {
  const center = boxCenter(box);
  const points = [{ x: box.x, y: box.y }, { x: box.x + box.width, y: box.y }, { x: box.x + box.width, y: box.y + box.height }, { x: box.x, y: box.y + box.height }].map(point => rotatePoint(point, center, box.rotation));
  const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y));
  return { x, y, width: Math.max(...points.map(p => p.x)) - x, height: Math.max(...points.map(p => p.y)) - y, rotation: 0 };
}
export function intersects(a: Pick<Box, 'x' | 'y' | 'width' | 'height'>, b: Pick<Box, 'x' | 'y' | 'width' | 'height'>): boolean {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}
export function selectionBounds(boxes: Box[]): Box | null {
  if (!boxes.length) return null;
  const first = boxes[0];
  if (boxes.length === 1 && first) return { ...first };
  const bounds = boxes.map(rotatedBounds);
  const x = Math.min(...bounds.map(b => b.x)), y = Math.min(...bounds.map(b => b.y));
  return { x, y, width: Math.max(...bounds.map(b => b.x + b.width)) - x, height: Math.max(...bounds.map(b => b.y + b.height)) - y, rotation: 0 };
}
export function resizeBox(box: Box, handle: ResizeHandle, delta: Point, preserveAspect = false, minimum = 8): Box {
  const local = rotatePoint(delta, { x: 0, y: 0 }, -box.rotation);
  const west = handle.includes('w'), east = handle.includes('e'), north = handle.includes('n'), south = handle.includes('s');
  let width = Math.max(minimum, box.width + (east ? local.x : west ? -local.x : 0));
  let height = Math.max(minimum, box.height + (south ? local.y : north ? -local.y : 0));
  if (preserveAspect) {
    const ratio = Math.max(1, box.width) / Math.max(1, box.height);
    if ((east || west) && (north || south)) {
      if (Math.abs(width / Math.max(1, box.width) - 1) >= Math.abs(height / Math.max(1, box.height) - 1)) height = width / ratio;
      else width = height * ratio;
    } else if (east || west) height = width / ratio;
    else width = height * ratio;
    const factor = Math.max(1, minimum / width, minimum / height);
    width *= factor; height *= factor;
  }
  const shift = rotatePoint({ x: (east ? 1 : west ? -1 : 0) * (width - box.width) / 2, y: (south ? 1 : north ? -1 : 0) * (height - box.height) / 2 }, { x: 0, y: 0 }, box.rotation);
  const center = boxCenter(box);
  return { x: center.x + shift.x - width / 2, y: center.y + shift.y - height / 2, width, height, rotation: box.rotation };
}
export function rotationFromPointer(center: Point, start: Point, current: Point, initial: number, snap = false): number {
  const angle = initial + degrees(Math.atan2(current.y - center.y, current.x - center.x) - Math.atan2(start.y - center.y, start.x - center.x));
  return normalizeAngle(snap ? Math.round(angle / 15) * 15 : angle);
}
export function fitScale(width: number, height: number, slideWidth = 1920, slideHeight = 1080): number {
  return Math.max(0.02, Math.min(width / slideWidth, height / slideHeight));
}

export interface SnapGuide { axis: 'x' | 'y'; position: number }
/** Snap a translated selection to nearby edges/centers, then optionally to the grid. */
export function snapTranslation(box: Box, delta: Point, targets: Box[], spacing: number | null, tolerance: number): { delta: Point; guides: SnapGuide[] } {
  const moving = rotatedBounds({ ...box, x: box.x + delta.x, y: box.y + delta.y });
  const guides: SnapGuide[] = [];
  const snapped = { ...delta };
  for (const axis of ['x', 'y'] as const) {
    const length = axis === 'x' ? 'width' : 'height';
    const anchors = [moving[axis], moving[axis] + moving[length] / 2, moving[axis] + moving[length]];
    let correction = tolerance + 1;
    let position: number | undefined;
    for (const target of targets) {
      for (const candidate of [target[axis], target[axis] + target[length] / 2, target[axis] + target[length]]) {
        for (const anchor of anchors) {
          const difference = candidate - anchor;
          if (Math.abs(difference) <= tolerance && Math.abs(difference) < Math.abs(correction)) {
            correction = difference;
            position = candidate;
          }
        }
      }
    }
    if (position !== undefined) {
      snapped[axis] += correction;
      guides.push({ axis, position });
    } else if (spacing !== null && spacing > 0) {
      snapped[axis] += Math.round(moving[axis] / spacing) * spacing - moving[axis];
    }
  }
  return { delta: snapped, guides };
}
function polygon(points: Point[]): string { return points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ') + ' Z'; }
function regularPolygon(sides: number, star = false): string {
  return polygon(Array.from({ length: star ? sides * 2 : sides }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / (star ? sides * 2 : sides);
    const radius = star && i % 2 ? 22 : 50;
    return { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius };
  }));
}
/** Normalized 100×100 paths. Scale the SVG viewBox to element dimensions. */
export function shapePath(shape: ShapeKind, cornerRadius = 8): string {
  const r = Math.min(50, Math.max(0, cornerRadius));
  switch (shape) {
    case 'rect': return 'M0 0 H100 V100 H0 Z';
    case 'roundRect': return `M${r} 0 H${100-r} Q100 0 100 ${r} V${100-r} Q100 100 ${100-r} 100 H${r} Q0 100 0 ${100-r} V${r} Q0 0 ${r} 0 Z`;
    case 'ellipse': return 'M50 0 A50 50 0 1 1 49.99 0 Z';
    case 'triangle': return 'M50 0 L100 100 H0 Z';
    case 'rightTriangle': return 'M0 0 L100 100 H0 Z';
    case 'diamond': return 'M50 0 L100 50 50 100 0 50 Z';
    case 'pentagon': return regularPolygon(5);
    case 'hexagon': return regularPolygon(6);
    case 'octagon': return regularPolygon(8);
    case 'star5': return regularPolygon(5, true);
    case 'star6': return regularPolygon(6, true);
    case 'arrowRight': return 'M0 28 H60 V0 L100 50 60 100 V72 H0 Z';
    case 'arrowLeft': return 'M100 28 H40 V0 L0 50 40 100 V72 H100 Z';
    case 'arrowUp': return 'M28 100 V40 H0 L50 0 100 40 H72 V100 Z';
    case 'arrowDown': return 'M28 0 V60 H0 L50 100 100 60 H72 V0 Z';
    case 'arrowDouble': return 'M0 50 L28 0 V28 H72 V0 L100 50 72 100 V72 H28 V100 Z';
    case 'chevron': return 'M0 0 H65 L100 50 65 100 H0 L35 50 Z';
    case 'parallelogram': return 'M25 0 H100 L75 100 H0 Z';
    case 'trapezoid': return 'M25 0 H75 L100 100 H0 Z';
    case 'plus': return 'M33 0 H67 V33 H100 V67 H67 V100 H33 V67 H0 V33 H33 Z';
    case 'heart': return 'M50 95 C35 80 0 58 0 28 C0 -3 40 -10 50 20 C60 -10 100 -3 100 28 C100 58 65 80 50 95 Z';
    case 'cloud': return 'M24 82 C-8 82 -5 42 17 39 C10 12 42 1 58 19 C80 1 105 24 90 46 C111 65 94 87 74 82 Z';
    case 'calloutRect': return 'M0 0 H100 V75 H45 L20 100 25 75 H0 Z';
    case 'calloutEllipse': return 'M23 78 C-15 57 -3 0 50 0 C111 0 115 70 65 82 L20 100 Z';
  }
}
