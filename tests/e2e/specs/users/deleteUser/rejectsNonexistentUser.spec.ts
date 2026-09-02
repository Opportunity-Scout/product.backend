import { randomUUID } from 'crypto';
import { test, expect } from '../../../fixtures/test';
import { httpStatus } from '../../../constants';

test.describe('DELETE /users/:id → nonexistent user', () => {
  test('Rejects a nonexistent user id with 404', { tag: '@T2f3ed283' }, async ({ backendApi, apiHelper }) => {
    const adminAccessToken = await apiHelper.getAdminAccessToken();
    const deleteResponse = await backendApi.users.deleteUser(adminAccessToken, randomUUID());

    expect(deleteResponse.status(), 'A nonexistent user id should be rejected with 404').toBe(httpStatus.NOT_FOUND);
  });
});
