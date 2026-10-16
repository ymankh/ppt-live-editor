import { defineConfig } from '@playwright/test';
import path from 'node:path';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5174', headless: true },
  webServer: [
    {
      command: 'dotnet run --project ../backend/Folio.Api --no-launch-profile',
      cwd: import.meta.dirname,
      env: {
        ASPNETCORE_URLS: 'http://127.0.0.1:5081',
        Database__Path: path.resolve(import.meta.dirname, '../.cache/playwright/folio.db'),
      },
      url: 'http://127.0.0.1:5081/api/health',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
      cwd: import.meta.dirname,
      env: { FOLIO_API_URL: 'http://127.0.0.1:5081' },
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
    },
  ],
  reporter: 'list',
});
