import { test, expect } from '../../fixtures/test';
import { httpStatus } from '../../constants/httpStatus';
import { LoginResponseSchema } from '../../schemas/auth/LoginResponseSchema';
import { ListUsersResponseSchema } from '../../schemas/users/ListUsersResponseSchema';
import { jwtHelper } from '../../helpers/jwtHelper';
import testData from '../../testData/auth/login';

test.describe('POST /auth/telegram', () => {
  const { newUserLoginPayload } = testData;

  test('Logs in a new user and returns a bearer token', async ({ backendApi, apiHelper, responseContract }) => {
    const loginResponse = await backendApi.auth.login(newUserLoginPayload);
    const loginResponseBody = await responseContract.validate(loginResponse, httpStatus.OK, LoginResponseSchema);
    const adminAccessToken = await apiHelper.getAdminAccessToken();
    const listResponse = await backendApi.users.list(adminAccessToken, { search: newUserLoginPayload.username });
    const listBody = await responseContract.validate(listResponse, httpStatus.OK, ListUsersResponseSchema);
    const [loggedInUser] = listBody.users;

    await jwtHelper.expectTokenIsValid(loginResponseBody.token);
    expect(listBody.users, 'Expected exactly one matching user').toHaveLength(1);
    expect(loggedInUser.telegramUsername, 'Username should match').toBe(newUserLoginPayload.username);
  });
});
