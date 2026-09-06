import { test, expect } from '../../../fixtures/test';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_OFFSET, httpStatus } from '../../../constants';
import { LoginResponseSchema } from '../../../schemas/auth';
import { ListUsersResponseSchema } from '../../../schemas/users';
import { GetUsersListResponse } from '../../../api/users/interfaces';
import { TelegramLoginResponse } from '../../../api/auth/interfaces';
import { jwtHelper } from '../../../helpers/jwtHelper';
import testData from '../../../testData/users/getUsers/returnsAllUsers';

test.describe('GET /users → returns all users', () => {
  const { newUserLoginPayload, minimumExpectedUserCount } = testData;

  let loginResponseBody: TelegramLoginResponse;
  let createdUserId: string;

  test.afterAll(async ({ backendApi }) => {
    await backendApi.users.deleteUser(loginResponseBody.token, createdUserId);
  });

  test('Returns every user when called without a filter', { tag: '@Td2e104b0' }, async ({ backendApi, apiHelper, responseContract }) => {
    const loginResponse = await backendApi.auth.login(newUserLoginPayload);
    loginResponseBody = await responseContract.validate(loginResponse, httpStatus.OK, LoginResponseSchema);
    createdUserId = jwtHelper.decode(loginResponseBody.token).sub;
    const adminAccessToken = await apiHelper.getAdminAccessToken();
    const listResponse = await backendApi.users.getUsers(adminAccessToken);
    const listBody: GetUsersListResponse = await responseContract.validate(listResponse, httpStatus.OK, ListUsersResponseSchema);
    const expectedUsersLength = Math.min(listBody.total, DEFAULT_PAGE_LIMIT);

    expect(listBody.users.length, 'Returned users should be capped at min(total, limit)').toBe(expectedUsersLength);
    expect(listBody.total, 'Expected more than one user without a filter').toBeGreaterThanOrEqual(minimumExpectedUserCount);
    expect(listBody.limit, 'limit should default to DEFAULT_PAGE_LIMIT').toBe(DEFAULT_PAGE_LIMIT);
    expect(listBody.offset, 'offset should default to DEFAULT_PAGE_OFFSET').toBe(DEFAULT_PAGE_OFFSET);
  });
});
