import { test, expect } from './fixtures.js';

test('slide rasterization retains background and artwork from off-screen staging', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Presentation title' })).toBeVisible();
  // Run browser-only DOM and Vite module imports in the page, not the Node test runner.
  const pixels = await page.evaluate<{ background: number[]; shape: number[] }>(`(async () => {
    const { createPresentation, createElement } = await import('/src/lib/defaults.ts');
    const { rasterizeSlide } = await import('/src/features/export/raster.tsx');
    const presentation = createPresentation();
    presentation.slideSize = { width: 320, height: 180 };
    const slide = presentation.slides[0];
    if (!slide) throw new Error('Missing slide fixture');
    slide.background = { type: 'solid', color: '#114477' };
    const shape = createElement('shape');
    Object.assign(shape, { x: 80, y: 40, width: 80, height: 80, fill: { type: 'solid', color: '#dd4422' } });
    slide.elements = [shape];
    const image = new Image();
    image.src = await rasterizeSlide(presentation, slide);
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.drawImage(image, 0, 0);
    return {
      background: Array.from(context.getImageData(10, 10, 1, 1).data),
      shape: Array.from(context.getImageData(120, 80, 1, 1).data),
    };
  })()`);
  expect(pixels.background).toEqual([17, 68, 119, 255]);
  expect(pixels.shape).toEqual([221, 68, 34, 255]);
});
