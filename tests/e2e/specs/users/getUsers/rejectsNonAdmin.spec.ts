import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';
import { LoginResponseSchema } from '@/schemas/auth';
import { TelegramLoginResponse } from '@/api/auth/interfaces';
import { jwtHelper } from '@/helpers/jwtHelper';
import testData from '@/testData/users/getUsers/rejectsNonAdmin';

test.describe('GET /users → rejects non-admin', () => {
  const { newUserLoginPayload } = testData;

  let loginResponseBody: TelegramLoginResponse;
  let createdUserId: string;

  test.afterAll(async ({ backendApi }) => {
    await backendApi.users.deleteUser(loginResponseBody.token, createdUserId);
  });

  test('Rejects a non-admin caller with 403', { tag: '@Tc53f1b89' }, async ({ backendApi, responseContract }) => {
    const loginResponse = await backendApi.auth.login(newUserLoginPayload);
    loginResponseBody = await responseContract.validate(loginResponse, httpStatus.OK, LoginResponseSchema);
    createdUserId = jwtHelper.decode(loginResponseBody.token).sub;
    const listResponse = await backendApi.users.getUsers(loginResponseBody.token);

    expect(listResponse.status(), 'A non-admin caller should be rejected with 403').toBe(httpStatus.FORBIDDEN);
  });
});
