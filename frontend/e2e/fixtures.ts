import { test as base, expect, type Page } from '@playwright/test';

// This server is owned by Playwright and uses a separate database and ports.
// Browser contexts alone no longer isolate project persistence.
export const test = base.extend({
  page: async ({ page, request, baseURL }, runTest) => {
    if (baseURL !== 'http://127.0.0.1:5174') throw new Error('Project reset requires the isolated Playwright server');
    const response = await request.get('/api/projects');
    expect(response.ok()).toBe(true);
    const projects = await response.json() as { id: string }[];
    for (const project of projects) {
      const deleted = await request.delete(`/api/projects/${encodeURIComponent(project.id)}`);
      expect(deleted.status()).toBe(204);
    }
    await runTest(page);
  },
});

export { expect, type Page };
