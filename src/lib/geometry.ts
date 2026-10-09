import type { Point, ShapeKind } from '@/types/model';
import { strings } from "@/strings";


export interface Box { x: number; y: number; width: number; height: number; rotation: number }
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
export const resizeHandles: ResizeHandle[] = [strings.geometry.nw, strings.geometry.n, strings.geometry.ne, strings.common.e, strings.geometry.se, strings.common.s, strings.geometry.sw, strings.common.w];
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
  const west = handle.includes(strings.common.w), east = handle.includes(strings.common.e), north = handle.includes(strings.geometry.n), south = handle.includes(strings.common.s);
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
  for (const axis of [strings.common.x, strings.common.y] as const) {
    const length = axis === strings.common.x ? strings.common.width : strings.common.height;
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
function polygon(points: Point[]): string { return points.map((p, i) => `${i ? strings.common.l : strings.common.m}${p.x}${strings.common.symbol_d03502c4}${p.y}`).join(strings.common.space) + strings.geometry.z; }
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
    case strings.common.rect: return strings.geometry.m00H100V100H0Z;
    case strings.common.roundRect: return `${strings.common.m}${r}${strings.geometry.value0H}${100-r}${strings.geometry.q1000100}${r}${strings.common.v}${100-r}${strings.geometry.q100100}${100-r}${strings.geometry.value100H}${r}${strings.geometry.q01000}${100-r}${strings.common.v}${r}${strings.geometry.q00}${r}${strings.geometry.value0Z}`;
    case strings.common.ellipse: return strings.geometry.m500A50500114999;
    case strings.common.triangle: return strings.geometry.m500L100100H0Z;
    case strings.common.rightTriangle: return strings.geometry.m00L100100H0Z;
    case strings.common.diamond: return strings.geometry.m500L1005050100050Z;
    case strings.common.pentagon: return regularPolygon(5);
    case strings.common.hexagon: return regularPolygon(6);
    case strings.common.octagon: return regularPolygon(8);
    case strings.common.star5: return regularPolygon(5, true);
    case strings.common.star6: return regularPolygon(6, true);
    case strings.common.arrowRight: return strings.geometry.m028H60V0L1005060100V72;
    case strings.common.arrowLeft: return strings.geometry.m10028H40V0L05040100V72;
    case strings.common.arrowUp: return strings.geometry.m28100V40H0L50010040H72;
    case strings.common.arrowDown: return strings.geometry.m280V60H0L5010010060H72;
    case strings.common.arrowDouble: return strings.geometry.m050L280V28H72V0L10050;
    case strings.common.chevron: return strings.geometry.m00H65L1005065100H0L35;
    case strings.common.parallelogram: return strings.geometry.m250H100L75100H0Z;
    case strings.common.trapezoid: return strings.geometry.m250H75L100100H0Z;
    case strings.common.plus: return strings.geometry.m330H67V33H100V67H67V100H33;
    case strings.common.heart: return strings.geometry.m5095C3580058028C0;
    case strings.common.cloud: return strings.geometry.m2482C8825421739;
    case strings.common.calloutRect: return strings.geometry.m00H100V75H45L201002575;
    case strings.common.calloutEllipse: return strings.geometry.m2378C155730500;
  }
}
