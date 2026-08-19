import { test as base, expect } from '@playwright/test';
import { BackendApi } from '../api/BackendApi';
import { ApiHelper } from '../helpers/apiHelper';
import { responseContract } from '../helpers/responseContractHelper';
import { Fixtures } from './interfaces';

export const test = base.extend<Fixtures>({
  backendApi: async ({ request }, use) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set — copy .env.example to .env and fill it in');
    }

    await use(new BackendApi(request, botToken));
  },
  // eslint-disable-next-line no-empty-pattern
  responseContract: async ({}, use) => {
    await use(responseContract);
  },
  apiHelper: async ({ backendApi }, use) => {
    const adminTelegramUserId = process.env.ADMIN_TELEGRAM_USER_ID;

    if (!adminTelegramUserId) {
      throw new Error(
        'ADMIN_TELEGRAM_USER_ID is not set — see CLAUDE.md "E2E admin identity" for how to provision one',
      );
    }

    await use(new ApiHelper(backendApi.auth, adminTelegramUserId));
  },
});

export { expect };
