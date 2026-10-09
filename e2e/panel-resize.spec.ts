import { test, expect } from '@playwright/test';

test('sidebars and thumbnails fill their panels after resizing and reload', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const slides = page.locator('#slides');
  const properties = page.locator('#properties');
  const thumbnail = page.getByRole('button', { name: 'Slide 1', exact: true });
  await expect(thumbnail.locator('.renderer-slide-viewport')).toBeVisible();
  const initialThumbnail = await thumbnail.boundingBox();
  if (!initialThumbnail) throw new Error('Missing thumbnail bounds');

  for (const [index, delta] of [[0, 70], [1, -65]] as const) {
    const handle = await page.locator('[data-slot="resizable-handle"]').nth(index).boundingBox();
    if (!handle) throw new Error('Missing resize handle');
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle.x + delta, handle.y + handle.height / 2, { steps: 12 });
    await page.mouse.up();
  }

  await expect.poll(async () => (await thumbnail.boundingBox())?.width ?? 0).toBeGreaterThan(initialThumbnail.width + 50);
  const assertPanelBounds = async () => {
    for (const panel of [slides, properties]) {
      const bounds = await panel.boundingBox();
      const content = await panel.locator('aside').boundingBox();
      if (!bounds || !content) throw new Error('Missing sidebar bounds');
      expect(content.width).toBeCloseTo(bounds.width, 1);
      expect(content.height).toBeCloseTo(bounds.height, 1);
    }
    await expect.poll(async () => {
      const host = await thumbnail.locator('.slide-thumbnail-scale').boundingBox();
      const artwork = await thumbnail.locator('.renderer-slide-viewport').boundingBox();
      return host && artwork ? Math.abs(host.width - artwork.width) : Infinity;
    }).toBeLessThan(1);
  };
  await assertPanelBounds();
  const expandedSlides = await slides.boundingBox();
  await page.reload();
  await expect(thumbnail.locator('.renderer-slide-viewport')).toBeVisible();
  await assertPanelBounds();
  expect((await slides.boundingBox())?.width).toBeCloseTo(expandedSlides?.width ?? 0, 1);
});
