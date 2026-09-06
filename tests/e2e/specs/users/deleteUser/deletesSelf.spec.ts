import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';
import { LoginResponseSchema } from '@/schemas/auth';
import { ListUsersResponseSchema } from '@/schemas/users';
import { GetUsersListResponse } from '@/api/users/interfaces';
import { TelegramLoginResponse } from '@/api/auth/interfaces';
import { jwtHelper } from '@/helpers/jwtHelper';
import testData from '@/testData/users/deleteUser/deletesSelf';

test.describe('DELETE /users/:id → deletes self', () => {
  const { newUserLoginPayload, zeroEntitiesCount } = testData;

  test('A user deletes their own account', { tag: '@T66a36d1c' }, async ({ backendApi, apiHelper, responseContract }) => {
    const loginResponse = await backendApi.auth.login(newUserLoginPayload);
    const loginResponseBody: TelegramLoginResponse = await responseContract.validate(loginResponse, httpStatus.OK, LoginResponseSchema);
    const targetUserId = jwtHelper.decode(loginResponseBody.token).sub;
    const adminAccessToken = await apiHelper.getAdminAccessToken();
    const deleteResponse = await backendApi.users.deleteUser(loginResponseBody.token, targetUserId);
    const listResponse = await backendApi.users.getUsers(adminAccessToken, { telegramUsername: newUserLoginPayload.username });
    const listBody: GetUsersListResponse = await responseContract.validate(listResponse, httpStatus.OK, ListUsersResponseSchema);

    expect(deleteResponse.status(), 'Self-deletion should return 204 No Content').toBe(httpStatus.NO_CONTENT);
    expect(listBody.users, 'The deleted user should no longer be findable').toHaveLength(zeroEntitiesCount);
  });
});
