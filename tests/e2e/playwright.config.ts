import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'https://befirstapp.com',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
});
