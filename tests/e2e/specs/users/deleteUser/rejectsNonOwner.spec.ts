import { test, expect } from '../../../fixtures/test';
import { httpStatus } from '../../../constants';
import { LoginResponseSchema } from '../../../schemas/auth';
import { TelegramLoginResponse } from '../../../api/auth/interfaces';
import { jwtHelper } from '../../../helpers/jwtHelper';
import testData from '../../../testData/users/deleteUser/rejectsNonOwner';

test.describe('DELETE /users/:id → rejects non-owner', () => {
  const { victimLoginPayload, attackerLoginPayload } = testData;

  let victimLoginResponseBody: TelegramLoginResponse;
  let attackerLoginResponseBody: TelegramLoginResponse;
  let victimId: string;
  let attackerId: string;

  test.afterAll(async ({ backendApi }) => {
    await backendApi.users.deleteUser(victimLoginResponseBody.token, victimId);
    await backendApi.users.deleteUser(attackerLoginResponseBody.token, attackerId);
  });

  test('Rejects a non-owner, non-admin caller with 404', { tag: '@T8e752430' }, async ({ backendApi, responseContract }) => {
    const victimLoginResponse = await backendApi.auth.login(victimLoginPayload);
    victimLoginResponseBody = await responseContract.validate(victimLoginResponse, httpStatus.OK, LoginResponseSchema);
    victimId = jwtHelper.decode(victimLoginResponseBody.token).sub;

    const attackerLoginResponse = await backendApi.auth.login(attackerLoginPayload);
    attackerLoginResponseBody = await responseContract.validate(attackerLoginResponse, httpStatus.OK, LoginResponseSchema);
    attackerId = jwtHelper.decode(attackerLoginResponseBody.token).sub;

    const deleteResponse = await backendApi.users.deleteUser(attackerLoginResponseBody.token, victimId);

    expect(deleteResponse.status(), 'A non-owner, non-admin caller should be rejected with 404').toBe(httpStatus.NOT_FOUND);
  });
});
