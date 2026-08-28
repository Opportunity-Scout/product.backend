import { test, expect } from '../../fixtures/test';
import { httpStatus } from '../../constants';
import { LoginResponseSchema } from '../../schemas/auth/LoginResponseSchema';
import { ListUsersResponseSchema } from '../../schemas/users/ListUsersResponseSchema';
import { jwtHelper } from '../../helpers/jwtHelper';
import { GetUsersListResponse, User } from '../../api/users/interfaces';
import { TelegramLoginResponse } from '../../api/auth/interfaces';
import testData from '../../testData/auth/login';

test.describe('POST /auth/telegram', () => {
  const { newUserLoginPayload, expectedEntitiesCount } = testData;

  let loginResponseBody: TelegramLoginResponse;
  let user: User;

  test.afterAll(async ({ backendApi }) => {
    await backendApi.users.delete(loginResponseBody.token, user.id);
  });

  test('Logs in a new user and returns a bearer token', async ({ backendApi, apiHelper, responseContract }) => {
    const loginResponse = await backendApi.auth.login(newUserLoginPayload);
    loginResponseBody = await responseContract.validate(loginResponse, httpStatus.OK, LoginResponseSchema);
    const adminAccessToken = await apiHelper.getAdminAccessToken();

    const listResponse = await backendApi.users.list(adminAccessToken, {
      telegramUsername: newUserLoginPayload.username,
    });

    const listBody: GetUsersListResponse = await responseContract.validate(listResponse, httpStatus.OK, ListUsersResponseSchema);
    [user] = listBody.users;

    await jwtHelper.expectTokenIsValid(loginResponseBody.token);
    expect(listBody.users, 'Expected exactly one matching user').toHaveLength(expectedEntitiesCount);
    expect(user.telegramUsername, 'Username should match').toBe(newUserLoginPayload.username);
  });
});
