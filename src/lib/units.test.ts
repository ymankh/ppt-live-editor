import { describe, expect, it } from 'vitest';
import { fitSlide, inchesToUnits, pointsToUnits, unitsToInches, unitsToPoints } from './units';

describe('slide unit conversions', () => {
  it('maps the logical widescreen slide to PowerPoint inches', () => {
    expect(unitsToInches(1920)).toBeCloseTo(13.3333333333);
    expect(unitsToInches(1080)).toBe(7.5);
  });
  it('round trips fractional and negative dimensions', () => {
    for (const value of [0, 1, 24.75, -144, 1920]) {
      expect(inchesToUnits(unitsToInches(value))).toBeCloseTo(value);
      expect(pointsToUnits(unitsToPoints(value))).toBeCloseTo(value);
    }
  });
  it('fits without stretching or overflowing', () => {
    expect(fitSlide(960, 540)).toBe(0.5);
    expect(fitSlide(1920, 540)).toBe(0.5);
    expect(fitSlide(0, 540)).toBe(0);
    expect(fitSlide(-10, 540)).toBe(0);
  });
});
