import { test as base, expect } from '@playwright/test';
import { linkTest } from '@testomatio/reporter';
import { BackendApi } from '../api/BackendApi';
import { ApiHelper } from '../helpers/apiHelper';
import { responseContract } from '../helpers/responseContractHelper';
import { BASE_URL } from '../constants';
import { Fixtures, WorkerFixtures } from './interfaces';

const TESTOMATIO_TAG_PATTERN = /^@(T[0-9a-f]{8})$/;

export const test = base.extend<Fixtures, WorkerFixtures>({
  backendApi: [
    async ({ playwright }, use) => {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (!botToken) {
        throw new Error('TELEGRAM_BOT_TOKEN is not set — copy .env.example to .env and fill it in');
      }

      const context = await playwright.request.newContext({ baseURL: BASE_URL });

      await use(new BackendApi(context, botToken));
      await context.dispose();
    },
    { scope: 'worker' },
  ],
  // eslint-disable-next-line no-empty-pattern
  responseContract: async ({}, use) => {
    await use(responseContract);
  },
  apiHelper: [
    async ({ backendApi }, use) => {
      const adminTelegramUserId = process.env.ADMIN_TELEGRAM_USER_ID;

      if (!adminTelegramUserId) {
        throw new Error('ADMIN_TELEGRAM_USER_ID is not set — see CLAUDE.md "E2E admin identity" for how to provision one');
      }

      await use(new ApiHelper(backendApi.auth, adminTelegramUserId));
    },
    { scope: 'worker' },
  ],
  linkTestomatioTag: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, testInfo) => {
      testInfo.tags.forEach((tag) => {
        const match = tag.match(TESTOMATIO_TAG_PATTERN);

        if (match) {
          linkTest(match[1]);
        }
      });

      await use();
    },
    { auto: true },
  ],
});

export { expect };
