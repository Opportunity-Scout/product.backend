import { test, expect } from '../../../fixtures/test';
import { httpStatus } from '../../../constants';
import { LoginResponseSchema } from '../../../schemas/auth';
import { TelegramLoginResponse } from '../../../api/auth/interfaces';
import { jwtHelper } from '../../../helpers/jwtHelper';
import testData from '../../../testData/users/setSearchProfileLimit/rejectsNonAdmin';

test.describe('PATCH /users/:id/search-profile-limit → rejects non-admin', () => {
  const { newUserLoginPayload, newLimit } = testData;

  let loginResponseBody: TelegramLoginResponse;
  let createdUserId: string;

  test.afterAll(async ({ backendApi }) => {
    await backendApi.users.deleteUser(loginResponseBody.token, createdUserId);
  });

  test('Rejects a non-admin caller with 403', { tag: '@Tce134b59' }, async ({ backendApi, responseContract }) => {
    const loginResponse = await backendApi.auth.login(newUserLoginPayload);
    loginResponseBody = await responseContract.validate(loginResponse, httpStatus.OK, LoginResponseSchema);
    createdUserId = jwtHelper.decode(loginResponseBody.token).sub;
    const patchResponse = await backendApi.users.setSearchProfileLimit(loginResponseBody.token, createdUserId, newLimit);

    expect(patchResponse.status(), 'A non-admin caller should be rejected with 403').toBe(httpStatus.FORBIDDEN);
  });
});
