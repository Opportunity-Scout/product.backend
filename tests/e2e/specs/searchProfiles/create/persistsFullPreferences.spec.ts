import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';
import { LoginResponseSchema } from '@/schemas/auth';
import { SearchProfileResponseSchema } from '@/schemas/searchProfiles';
import { SearchProfile } from '@/api/searchProfiles/interfaces';
import { SearchProfileStatus } from '@/api/searchProfiles/types/SearchProfileStatus';
import { TelegramLoginResponse } from '@/api/auth/interfaces';
import { jwtHelper } from '@/helpers/jwtHelper';
import testData from '@/testData/searchProfiles/create/persistsFullPreferences';

test.describe('POST /search-profiles → persists full preferences', () => {
  const { newUserLoginPayload, createSearchProfilePayload } = testData;

  let loginResponseBody: TelegramLoginResponse;
  let createdUserId: string;

  test.afterAll(async ({ backendApi }) => {
    await backendApi.users.deleteUser(loginResponseBody.token, createdUserId);
  });

  test('Persists a fully populated preferences payload', { tag: '@Tdad3d6ce' }, async ({ backendApi, responseContract }) => {
    const loginResponse = await backendApi.auth.login(newUserLoginPayload);
    loginResponseBody = await responseContract.validate(loginResponse, httpStatus.OK, LoginResponseSchema);
    createdUserId = jwtHelper.decode(loginResponseBody.token).sub;
    const createResponse = await backendApi.searchProfiles.create(loginResponseBody.token, createSearchProfilePayload);
    const createdProfile: SearchProfile = await responseContract.validate(createResponse, httpStatus.CREATED, SearchProfileResponseSchema);
    const expectedPreferences = createSearchProfilePayload.preferences;

    expect(createdProfile.userId, 'userId should belong to the creating user').toBe(createdUserId);
    expect(createdProfile.name, 'name should match what was sent').toBe(createSearchProfilePayload.name);
    expect(createdProfile.description, 'description should match what was sent').toBe(createSearchProfilePayload.description);
    expect(createdProfile.status, 'a freshly created profile should be active').toBe(SearchProfileStatus.Active);
    expect(createdProfile.lastMatchedAt, 'a freshly created profile should have no match yet').toBeNull();
    expect(createdProfile.preferences, 'every preferences sub-field should round-trip exactly as sent').toEqual(expectedPreferences);
  });
});
