export const SLIDE_UNITS_PER_INCH = 144;
export const POINTS_PER_INCH = 72;
export const unitsToInches = (units: number): number => units / SLIDE_UNITS_PER_INCH;
export const inchesToUnits = (inches: number): number => inches * SLIDE_UNITS_PER_INCH;
export const unitsToPoints = (units: number): number => unitsToInches(units) * POINTS_PER_INCH;
export const pointsToUnits = (points: number): number => inchesToUnits(points / POINTS_PER_INCH);
export const fitSlide = (width: number, height: number, slideWidth = 1920, slideHeight = 1080): number =>
  Math.max(0, Math.min(width / slideWidth, height / slideHeight));
