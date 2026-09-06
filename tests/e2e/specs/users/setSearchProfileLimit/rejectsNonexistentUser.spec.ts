import { randomUUID } from 'crypto';
import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';

test.describe('PATCH /users/:id/search-profile-limit → nonexistent user', () => {
  test('Rejects a nonexistent user id with 404', { tag: '@T9277ae5b' }, async ({ backendApi, apiHelper }) => {
    const adminAccessToken = await apiHelper.getAdminAccessToken();
    const patchResponse = await backendApi.users.setSearchProfileLimit(adminAccessToken, randomUUID(), 5);

    expect(patchResponse.status(), 'A nonexistent user id should be rejected with 404').toBe(httpStatus.NOT_FOUND);
  });
});
