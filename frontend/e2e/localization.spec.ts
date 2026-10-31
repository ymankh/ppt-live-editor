import { test, expect } from './fixtures.js';

test('Arabic settings persist without changing presentation content or coordinate direction', async ({ page, request }) => {
  await page.goto('/');
  const title = page.getByRole('textbox', { name: 'Presentation title' });
  await expect(title).toBeVisible();
  await title.fill('عرض عربي — English 123');
  await page.locator('.canvas-slide-frame .renderer-rich-text').first().press('Enter');
  const editor = page.locator('.renderer-editor .tiptap');
  await editor.fill('مرحبا بالعالم 123');
  await editor.press('Enter');
  await page.keyboard.insertText('Hello 456');
  await expect(editor.locator('p').first()).toHaveAttribute('dir', 'auto');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('dialog').locator('select').selectOption('ar');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.canvas-slide-frame .renderer-rich-text').first()).toContainText('مرحبا بالعالم 123');
  await expect.poll(async () => {
    const response = await request.get('/api/projects/latest/document');
    if (!response.ok()) return '';
    const saved = await response.json() as { title: string };
    return JSON.stringify(saved).includes('مرحبا بالعالم 123') ? saved.title : '';
  }).toBe('عرض عربي — English 123');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('input').first()).toHaveValue('عرض عربي — English 123');
  await expect(page.locator('.canvas-slide-frame .renderer-rich-text').first()).toContainText('مرحبا بالعالم 123');
  await page.locator('.header-actions button').filter({ has: page.locator('svg.lucide-settings') }).click();
  await page.getByRole('dialog').locator('select').selectOption('en');
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('textbox', { name: 'Presentation title' })).toHaveValue('عرض عربي — English 123');
});
