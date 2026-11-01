import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';
import { LoginResponseSchema } from '@/schemas/auth';
import { SearchProfileResponseSchema } from '@/schemas/searchProfiles';
import { SearchProfile } from '@/api/searchProfiles/interfaces';
import { SearchProfileStatus } from '@/api/searchProfiles/types/SearchProfileStatus';
import { TelegramLoginResponse } from '@/api/auth/interfaces';
import { jwtHelper } from '@/helpers/jwtHelper';
import testData from '@/testData/searchProfiles/create/returnsCreatedProfile';

test.describe('POST /search-profiles → returns created profile', () => {
  const {
    newUserLoginPayload,
    createSearchProfilePayload,
    expectedDefaultCompensation,
    expectedDefaultSeniority,
    expectedDefaultEmploymentTypes,
    expectedDefaultCompanies,
    expectedDefaultSources,
  } = testData;

  let loginResponseBody: TelegramLoginResponse;
  let createdUserId: string;

  test.afterAll(async ({ backendApi }) => {
    await backendApi.users.deleteUser(loginResponseBody.token, createdUserId);
  });

  test('Creates a Search Profile matching the sent fields', { tag: '@T8ad87462' }, async ({ backendApi, responseContract }) => {
    const loginResponse = await backendApi.auth.login(newUserLoginPayload);
    loginResponseBody = await responseContract.validate(loginResponse, httpStatus.OK, LoginResponseSchema);
    createdUserId = jwtHelper.decode(loginResponseBody.token).sub;
    const createResponse = await backendApi.searchProfiles.create(loginResponseBody.token, createSearchProfilePayload);
    const createdProfile: SearchProfile = await responseContract.validate(createResponse, httpStatus.CREATED, SearchProfileResponseSchema);
    const preferences = createdProfile.preferences;
    const expectedPreferences = createSearchProfilePayload.preferences;

    expect(createdProfile.userId, 'userId should belong to the creating user').toBe(createdUserId);
    expect(createdProfile.name, 'name should match what was sent').toBe(createSearchProfilePayload.name);
    expect(createdProfile.description, 'description should match what was sent').toBe(createSearchProfilePayload.description);
    expect(createdProfile.status, 'a freshly created profile should be active').toBe(SearchProfileStatus.Active);
    expect(createdProfile.lastMatchedAt, 'a freshly created profile should have no match yet').toBeNull();
    expect(preferences.keywords, 'keywords should match what was sent').toEqual(expectedPreferences.keywords);
    expect(preferences.location, 'location should match what was sent').toEqual(expectedPreferences.location);
    expect(preferences.compensation, 'omitted compensation should default to null fields').toEqual(expectedDefaultCompensation);
    expect(preferences.seniority, 'omitted seniority should default to an empty array').toEqual(expectedDefaultSeniority);
    expect(preferences.employmentTypes, 'omitted employmentTypes should default to an empty array').toEqual(expectedDefaultEmploymentTypes);
    expect(preferences.companies, 'omitted companies should default to empty include/exclude arrays').toEqual(expectedDefaultCompanies);
    expect(preferences.sources, 'omitted sources should default to an empty array').toEqual(expectedDefaultSources);
  });
});
