import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';
import { ListUsersResponseSchema } from '@/schemas/users';
import { GetUsersListResponse } from '@/api/users/interfaces';
import testData from '@/testData/users/getUsers/filtersByNonexistentUsername';

test.describe('GET /users → nonexistent username filter', () => {
  const { nonexistentUsername, expectedEntitiesCount } = testData;

  test(
    'Returns an empty list for a telegramUsername that matches no user',
    { tag: '@Tfecf8354' },
    async ({ backendApi, apiHelper, responseContract }) => {
      const adminAccessToken = await apiHelper.getAdminAccessToken();

      const listResponse = await backendApi.users.getUsers(adminAccessToken, {
        telegramUsername: nonexistentUsername,
      });

      const listBody: GetUsersListResponse = await responseContract.validate(listResponse, httpStatus.OK, ListUsersResponseSchema);

      expect(listBody.users, 'Expected no matching users').toHaveLength(expectedEntitiesCount);
      expect(listBody.total, 'total should be zero').toBe(expectedEntitiesCount);
    },
  );
});
