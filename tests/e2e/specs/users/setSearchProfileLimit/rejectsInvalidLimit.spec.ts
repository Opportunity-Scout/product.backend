import { randomUUID } from 'crypto';
import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';

test.describe('PATCH /users/:id/search-profile-limit → negative limit', () => {
  test('Rejects a negative limit with 400', { tag: '@Te21d603b' }, async ({ backendApi, apiHelper }) => {
    const adminAccessToken = await apiHelper.getAdminAccessToken();
    const patchResponse = await backendApi.users.setSearchProfileLimit(adminAccessToken, randomUUID(), -1);

    expect(patchResponse.status(), 'A negative limit should be rejected with 400').toBe(httpStatus.BAD_REQUEST);
  });
});
