import { test, expect } from '@/fixtures/test';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_OFFSET, DEFAULT_SEARCH_PROFILE_LIMIT, httpStatus } from '@/constants';
import { LoginResponseSchema } from '@/schemas/auth';
import { ListUsersResponseSchema } from '@/schemas/users';
import { GetUsersListResponse, User } from '@/api/users/interfaces';
import { UserRole } from '@/api/users/types/UserRole';
import { TelegramLoginResponse } from '@/api/auth/interfaces';
import testData from '@/testData/users/getUsers/filtersByUsername';

test.describe('GET /users → filters by username', () => {
  const { newUserLoginPayload, expectedEntitiesCount } = testData;

  let loginResponseBody: TelegramLoginResponse;
  let user: User;

  test.afterAll(async ({ backendApi }) => {
    await backendApi.users.deleteUser(loginResponseBody.token, user.id);
  });

  test(
    'Admin finds the newly created user by telegramUsername filter',
    { tag: '@T8a3ffb44' },
    async ({ backendApi, apiHelper, responseContract }) => {
      const loginResponse = await backendApi.auth.login(newUserLoginPayload);
      loginResponseBody = await responseContract.validate(loginResponse, httpStatus.OK, LoginResponseSchema);
      const adminAccessToken = await apiHelper.getAdminAccessToken();

      const listResponse = await backendApi.users.getUsers(adminAccessToken, {
        telegramUsername: newUserLoginPayload.username,
      });

      const listBody: GetUsersListResponse = await responseContract.validate(listResponse, httpStatus.OK, ListUsersResponseSchema);
      [user] = listBody.users;

      expect(listBody.users, 'Expected exactly one matching user').toHaveLength(expectedEntitiesCount);
      expect(listBody.total, 'total should reflect exactly one matching user').toBe(expectedEntitiesCount);
      expect(listBody.limit, 'limit should default to DEFAULT_PAGE_LIMIT').toBe(DEFAULT_PAGE_LIMIT);
      expect(listBody.offset, 'offset should default to DEFAULT_PAGE_OFFSET').toBe(DEFAULT_PAGE_OFFSET);
      expect(user.telegramUserId, 'telegramUserId should match the login payload').toBe(newUserLoginPayload.id);
      expect(user.telegramUsername, 'telegramUsername should match the login payload').toBe(newUserLoginPayload.username);
      expect(user.role, 'A newly created user should default to role "user"').toBe(UserRole.User);
      expect(user.searchProfileLimit, 'A newly created user should default to the free-tier limit').toBe(DEFAULT_SEARCH_PROFILE_LIMIT);
      expect(user.updatedAt, 'createdAt and updatedAt should match on creation').toBe(user.createdAt);
    },
  );
});
