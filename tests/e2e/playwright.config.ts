import { defineConfig } from '@playwright/test';
import { BASE_URL } from './constants';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  workers: process.env.CI ? 3 : 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.TESTOMATIO ? [['list'], ['@testomatio/reporter/playwright', { apiKey: process.env.TESTOMATIO }]] : 'list',
  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
});
