import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';
import { LoginResponseSchema } from '@/schemas/auth';
import { ListUsersResponseSchema } from '@/schemas/users';
import { GetUsersListResponse } from '@/api/users/interfaces';
import { TelegramLoginResponse } from '@/api/auth/interfaces';
import { jwtHelper } from '@/helpers/jwtHelper';
import testData from '@/testData/users/deleteUser/adminDeletesUser';

test.describe('DELETE /users/:id → admin deletes another user', () => {
  const { newUserLoginPayload, zeroEntitiesCount } = testData;

  test("Admin deletes another user's account", { tag: '@T4ef0f916' }, async ({ backendApi, apiHelper, responseContract }) => {
    const loginResponse = await backendApi.auth.login(newUserLoginPayload);
    const loginResponseBody: TelegramLoginResponse = await responseContract.validate(loginResponse, httpStatus.OK, LoginResponseSchema);
    const targetUserId = jwtHelper.decode(loginResponseBody.token).sub;
    const adminAccessToken = await apiHelper.getAdminAccessToken();
    const deleteResponse = await backendApi.users.deleteUser(adminAccessToken, targetUserId);
    const listResponse = await backendApi.users.getUsers(adminAccessToken, { telegramUsername: newUserLoginPayload.username });
    const listBody: GetUsersListResponse = await responseContract.validate(listResponse, httpStatus.OK, ListUsersResponseSchema);

    expect(deleteResponse.status(), 'Admin deletion should return 204 No Content').toBe(httpStatus.NO_CONTENT);
    expect(listBody.users, 'The deleted user should no longer be findable').toHaveLength(zeroEntitiesCount);
  });
});
