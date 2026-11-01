import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';
import { LoginResponseSchema } from '@/schemas/auth';
import { SearchProfileResponseSchema } from '@/schemas/searchProfiles';
import { TelegramLoginResponse } from '@/api/auth/interfaces';
import { jwtHelper } from '@/helpers/jwtHelper';
import testData from '@/testData/searchProfiles/getById/returnsCreatedProfile';

test.describe('GET /search-profiles/:id → returns created profile', () => {
  const { newUserLoginPayload, createSearchProfilePayload } = testData;

  let loginResponseBody: TelegramLoginResponse;
  let createdUserId: string;

  test.afterAll(async ({ backendApi }) => {
    await backendApi.users.deleteUser(loginResponseBody.token, createdUserId);
  });

  test('Returns the profile that was created', { tag: '@Teb53df87' }, async ({ backendApi, responseContract }) => {
    const loginResponse = await backendApi.auth.login(newUserLoginPayload);
    loginResponseBody = await responseContract.validate(loginResponse, httpStatus.OK, LoginResponseSchema);
    createdUserId = jwtHelper.decode(loginResponseBody.token).sub;
    const createResponse = await backendApi.searchProfiles.create(loginResponseBody.token, createSearchProfilePayload);
    const createdProfile = await responseContract.validate(createResponse, httpStatus.CREATED, SearchProfileResponseSchema);
    const getResponse = await backendApi.searchProfiles.getById(loginResponseBody.token, createdProfile.id);
    const fetchedProfile = await responseContract.validate(getResponse, httpStatus.OK, SearchProfileResponseSchema);

    expect(fetchedProfile, 'GET should return exactly what was created, read back through a separate request').toEqual(createdProfile);
  });
});
