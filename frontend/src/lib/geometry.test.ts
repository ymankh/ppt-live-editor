import { describe, expect, it } from 'vitest';
import { boxCenter, fitScale, intersects, normalizeAngle, resizeBox, rotatePoint, rotatedBounds, rotationFromPointer, selectionBounds, shapePath, snapTranslation } from './geometry';
import type { ShapeKind } from '@/types/model';

describe('slide geometry', () => {
  it('rotates around a center and normalizes negative angles', () => {
    const p = rotatePoint({ x: 20, y: 10 }, { x: 10, y: 10 }, 90);
    expect(p.x).toBeCloseTo(10); expect(p.y).toBeCloseTo(20);
    expect(normalizeAngle(-15)).toBe(345);
  });
  it('keeps the opposite rotated corner fixed during resizing', () => {
    const box = { x: 100, y: 80, width: 200, height: 100, rotation: 37 };
    const next = resizeBox(box, 'se', { x: 50, y: 60 });
    const before = rotatePoint({ x: box.x, y: box.y }, boxCenter(box), box.rotation);
    const after = rotatePoint({ x: next.x, y: next.y }, boxCenter(next), next.rotation);
    expect(after.x).toBeCloseTo(before.x); expect(after.y).toBeCloseTo(before.y);
  });
  it('preserves aspect ratio and minimum size without flipping', () => {
    const box = { x: 0, y: 0, width: 200, height: 100, rotation: 0 };
    const next = resizeBox(box, 'nw', { x: 500, y: 500 }, true);
    expect(next.width / next.height).toBeCloseTo(2);
    expect(next.width).toBeGreaterThanOrEqual(8); expect(next.height).toBeGreaterThanOrEqual(8);
  });
  it('calculates rotated bounds and multi-element bounds', () => {
    const box = { x: 0, y: 0, width: 200, height: 100, rotation: 90 };
    expect(rotatedBounds(box).width).toBeCloseTo(100);
    expect(rotatedBounds(box).height).toBeCloseTo(200);
    expect(selectionBounds([])).toBeNull();
    expect(selectionBounds([box])?.rotation).toBe(90);
    expect(selectionBounds([box, { x: 300, y: 0, width: 100, height: 100, rotation: 0 }])?.width).toBeCloseTo(350);
  });
  it('intersects edge-touching boxes and fits a logical slide', () => {
    expect(intersects({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 10, width: 5, height: 5 })).toBe(true);
    expect(intersects({ x: 0, y: 0, width: 10, height: 10 }, { x: 11, y: 11, width: 5, height: 5 })).toBe(false);
    expect(fitScale(960, 600)).toBe(0.5);
  });
  it('snaps rotations to 15 degree increments', () => {
    expect(rotationFromPointer({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, 20, true)).toBe(105);
  });
  it('snaps the whole selection to the closest neighboring edge or center', () => {
    const box = { x: 100, y: 100, width: 200, height: 100, rotation: 0 };
    const target = { x: 400, y: 180, width: 200, height: 100, rotation: 0 };
    const snapped = snapTranslation(box, { x: 97, y: 78 }, [target], null, 5);
    expect(snapped.delta).toEqual({ x: 100, y: 80 });
    expect(snapped.guides).toEqual([{ axis: 'x', position: 400 }, { axis: 'y', position: 180 }]);
  });
  it('falls back to the configured grid only when no smart guide is near', () => {
    const box = { x: 100, y: 100, width: 200, height: 100, rotation: 0 };
    expect(snapTranslation(box, { x: 11, y: 8 }, [], 24, 5)).toEqual({ delta: { x: 20, y: 20 }, guides: [] });
    expect(snapTranslation(box, { x: 11, y: 8 }, [], null, 5)).toEqual({ delta: { x: 11, y: 8 }, guides: [] });
  });
  it('aligns a rotated selection by its visible bounds', () => {
    const box = { x: 100, y: 100, width: 200, height: 100, rotation: 90 };
    const target = { x: 300, y: 400, width: 100, height: 100, rotation: 0 };
    const snapped = snapTranslation(box, { x: 47, y: 0 }, [target], null, 5);
    expect(snapped.delta.x).toBeCloseTo(50);
    expect(snapped.guides).toContainEqual({ axis: 'x', position: 300 });
  });
  it('provides closed SVG paths for every shape kind', () => {
    const kinds: ShapeKind[] = ['rect', 'roundRect', 'ellipse', 'triangle', 'rightTriangle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'star5', 'star6', 'arrowRight', 'arrowLeft', 'arrowUp', 'arrowDown', 'arrowDouble', 'chevron', 'parallelogram', 'trapezoid', 'plus', 'heart', 'cloud', 'calloutRect', 'calloutEllipse'];
    for (const kind of kinds) { expect(shapePath(kind)).toMatch(/^M/); expect(shapePath(kind)).toMatch(/Z$/); }
  });
});
