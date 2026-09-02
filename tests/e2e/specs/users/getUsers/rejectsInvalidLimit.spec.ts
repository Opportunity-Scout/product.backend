import { test, expect } from '../../../fixtures/test';
import { httpStatus } from '../../../constants';

test.describe('GET /users → limit below min', () => {
  test('Rejects an out-of-range limit with 400', { tag: '@Td1102f2e' }, async ({ backendApi, apiHelper }) => {
    const adminAccessToken = await apiHelper.getAdminAccessToken();
    const listResponse = await backendApi.users.getUsers(adminAccessToken, { limit: 0 });

    expect(listResponse.status(), 'limit=0 should be rejected with 400').toBe(httpStatus.BAD_REQUEST);
  });
});
