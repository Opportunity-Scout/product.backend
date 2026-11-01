import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';
import { LoginResponseSchema } from '@/schemas/auth';
import { SearchProfileResponseSchema } from '@/schemas/searchProfiles';
import { TelegramLoginResponse } from '@/api/auth/interfaces';
import { jwtHelper } from '@/helpers/jwtHelper';
import testData from '@/testData/searchProfiles/getById/rejectsNonOwner';

test.describe('GET /search-profiles/:id → rejects non-owner', () => {
  const { victimLoginPayload, attackerLoginPayload, createSearchProfilePayload } = testData;

  let victimLoginResponseBody: TelegramLoginResponse;
  let attackerLoginResponseBody: TelegramLoginResponse;
  let victimId: string;
  let attackerId: string;

  test.afterAll(async ({ backendApi }) => {
    await backendApi.users.deleteUser(victimLoginResponseBody.token, victimId);
    await backendApi.users.deleteUser(attackerLoginResponseBody.token, attackerId);
  });

  test('Rejects a non-owner, non-admin caller with 404', { tag: '@T0183c1b2' }, async ({ backendApi, responseContract }) => {
    const victimLoginResponse = await backendApi.auth.login(victimLoginPayload);
    victimLoginResponseBody = await responseContract.validate(victimLoginResponse, httpStatus.OK, LoginResponseSchema);
    victimId = jwtHelper.decode(victimLoginResponseBody.token).sub;

    const attackerLoginResponse = await backendApi.auth.login(attackerLoginPayload);
    attackerLoginResponseBody = await responseContract.validate(attackerLoginResponse, httpStatus.OK, LoginResponseSchema);
    attackerId = jwtHelper.decode(attackerLoginResponseBody.token).sub;

    const createResponse = await backendApi.searchProfiles.create(victimLoginResponseBody.token, createSearchProfilePayload);
    const createdProfile = await responseContract.validate(createResponse, httpStatus.CREATED, SearchProfileResponseSchema);
    const getResponse = await backendApi.searchProfiles.getById(attackerLoginResponseBody.token, createdProfile.id);

    expect(getResponse.status(), 'A non-owner, non-admin caller should be rejected with 404').toBe(httpStatus.NOT_FOUND);
  });
});
