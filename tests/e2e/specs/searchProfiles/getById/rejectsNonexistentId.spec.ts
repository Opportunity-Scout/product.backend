import { randomUUID } from 'crypto';
import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';

test.describe('GET /search-profiles/:id → rejects nonexistent id', () => {
  test('Rejects a well-formed but nonexistent id with 404', { tag: '@Tcf46f1b6' }, async ({ backendApi, apiHelper }) => {
    const adminAccessToken = await apiHelper.getAdminAccessToken();
    const getResponse = await backendApi.searchProfiles.getById(adminAccessToken, randomUUID());

    expect(getResponse.status(), 'A nonexistent id should be rejected with 404').toBe(httpStatus.NOT_FOUND);
  });
});
