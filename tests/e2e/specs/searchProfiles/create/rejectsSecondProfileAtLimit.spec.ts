import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';
import { LoginResponseSchema } from '@/schemas/auth';
import { SearchProfileResponseSchema } from '@/schemas/searchProfiles';
import { TelegramLoginResponse } from '@/api/auth/interfaces';
import { jwtHelper } from '@/helpers/jwtHelper';
import testData from '@/testData/searchProfiles/create/rejectsSecondProfileAtLimit';

test.describe('POST /search-profiles → rejects over free-tier limit', () => {
  const { newUserLoginPayload, createSearchProfilePayload } = testData;

  let loginResponseBody: TelegramLoginResponse;
  let createdUserId: string;

  test.afterAll(async ({ backendApi }) => {
    await backendApi.users.deleteUser(loginResponseBody.token, createdUserId);
  });

  test(
    'Rejects a second active profile once the free-tier limit is reached',
    { tag: '@T36941e46' },
    async ({ backendApi, responseContract }) => {
      const loginResponse = await backendApi.auth.login(newUserLoginPayload);
      loginResponseBody = await responseContract.validate(loginResponse, httpStatus.OK, LoginResponseSchema);
      createdUserId = jwtHelper.decode(loginResponseBody.token).sub;

      const firstCreateResponse = await backendApi.searchProfiles.create(loginResponseBody.token, createSearchProfilePayload);
      await responseContract.validate(firstCreateResponse, httpStatus.CREATED, SearchProfileResponseSchema);

      const secondCreateResponse = await backendApi.searchProfiles.create(loginResponseBody.token, createSearchProfilePayload);

      expect(secondCreateResponse.status(), 'A second active/paused profile beyond the free-tier limit should be rejected with 400').toBe(
        httpStatus.BAD_REQUEST,
      );
    },
  );
});
