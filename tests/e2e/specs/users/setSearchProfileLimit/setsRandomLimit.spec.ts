import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';
import { LoginResponseSchema } from '@/schemas/auth';
import { ListUsersResponseSchema, SetSearchProfileLimitResponseSchema } from '@/schemas/users';
import { GetUsersListResponse, SetSearchProfileLimitResponse } from '@/api/users/interfaces';
import { TelegramLoginResponse } from '@/api/auth/interfaces';
import { jwtHelper } from '@/helpers/jwtHelper';
import testData from '@/testData/users/setSearchProfileLimit/setsRandomLimit';

test.describe('PATCH /users/:id/search-profile-limit → sets random limit', () => {
  const { randomLimit, newUserLoginPayload } = testData;

  let loginResponseBody: TelegramLoginResponse;
  let targetUserId: string;

  test.afterAll(async ({ backendApi }) => {
    await backendApi.users.deleteUser(loginResponseBody.token, targetUserId);
  });

  test('Admin sets a random valid limit', { tag: '@T758f4638' }, async ({ backendApi, apiHelper, responseContract }) => {
    const loginResponse = await backendApi.auth.login(newUserLoginPayload);
    loginResponseBody = await responseContract.validate(loginResponse, httpStatus.OK, LoginResponseSchema);
    targetUserId = jwtHelper.decode(loginResponseBody.token).sub;
    const adminAccessToken = await apiHelper.getAdminAccessToken();
    const patchResponse = await backendApi.users.setSearchProfileLimit(adminAccessToken, targetUserId, randomLimit);

    const patchBody: SetSearchProfileLimitResponse = await responseContract.validate(
      patchResponse,
      httpStatus.OK,
      SetSearchProfileLimitResponseSchema,
    );

    const listResponse = await backendApi.users.getUsers(adminAccessToken, { telegramUsername: newUserLoginPayload.username });
    const listBody: GetUsersListResponse = await responseContract.validate(listResponse, httpStatus.OK, ListUsersResponseSchema);
    const [updatedUser] = listBody.users;

    expect(patchBody.id, 'id should match the target user').toBe(targetUserId);
    expect(patchBody.searchProfileLimit, 'searchProfileLimit should equal the requested random limit').toBe(randomLimit);
    expect(updatedUser.searchProfileLimit, 'the new limit should be persisted, not just echoed back in the PATCH response').toBe(
      randomLimit,
    );
  });
});
