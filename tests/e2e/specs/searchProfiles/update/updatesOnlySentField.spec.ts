import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';
import { LoginResponseSchema } from '@/schemas/auth';
import { SearchProfileResponseSchema } from '@/schemas/searchProfiles';
import { TelegramLoginResponse } from '@/api/auth/interfaces';
import { jwtHelper } from '@/helpers/jwtHelper';
import testData from '@/testData/searchProfiles/update/updatesOnlySentField';

test.describe('PATCH /search-profiles/:id → updates only sent field', () => {
  const { newUserLoginPayload, createSearchProfilePayload, updateNamePayload } = testData;

  let loginResponseBody: TelegramLoginResponse;
  let createdUserId: string;

  test.afterAll(async ({ backendApi }) => {
    await backendApi.users.deleteUser(loginResponseBody.token, createdUserId);
  });

  test('Updates only the sent field, leaves the rest unchanged', { tag: '@T7168371d' }, async ({ backendApi, responseContract }) => {
    const loginResponse = await backendApi.auth.login(newUserLoginPayload);
    loginResponseBody = await responseContract.validate(loginResponse, httpStatus.OK, LoginResponseSchema);
    createdUserId = jwtHelper.decode(loginResponseBody.token).sub;
    const createResponse = await backendApi.searchProfiles.create(loginResponseBody.token, createSearchProfilePayload);
    const createdProfile = await responseContract.validate(createResponse, httpStatus.CREATED, SearchProfileResponseSchema);
    const updateResponse = await backendApi.searchProfiles.update(loginResponseBody.token, createdProfile.id, updateNamePayload);
    const updatedProfile = await responseContract.validate(updateResponse, httpStatus.OK, SearchProfileResponseSchema);

    expect(updatedProfile.id, 'id should be unchanged').toBe(createdProfile.id);
    expect(updatedProfile.userId, 'userId should be unchanged').toBe(createdProfile.userId);
    expect(updatedProfile.status, 'status should be unchanged').toBe(createdProfile.status);
    expect(updatedProfile.lastMatchedAt, 'lastMatchedAt should be unchanged').toBe(createdProfile.lastMatchedAt);
    expect(updatedProfile.name, 'name should be replaced with the value sent in the PATCH').toBe(updateNamePayload.name);
    expect(updatedProfile.description, 'description should be unchanged since it was omitted from the PATCH').toBe(
      createdProfile.description,
    );
    expect(updatedProfile.preferences, 'preferences should be unchanged since it was omitted from the PATCH').toEqual(
      createdProfile.preferences,
    );
    expect(new Date(updatedProfile.updatedAt).getTime(), 'updatedAt should move forward even for a partial update').toBeGreaterThan(
      new Date(createdProfile.createdAt).getTime(),
    );
  });
});
