import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';
import { LoginResponseSchema } from '@/schemas/auth';
import { TelegramLoginResponse } from '@/api/auth/interfaces';
import { jwtHelper } from '@/helpers/jwtHelper';
import testData from '@/testData/searchProfiles/create/rejectsUnknownField';

test.describe('POST /search-profiles → rejects unknown field', () => {
  const { newUserLoginPayload, payloadWithUnknownField } = testData;

  let loginResponseBody: TelegramLoginResponse;
  let createdUserId: string;

  test.afterAll(async ({ backendApi }) => {
    await backendApi.users.deleteUser(loginResponseBody.token, createdUserId);
  });

  test('Rejects a body containing an unknown field', { tag: '@Td6f37254' }, async ({ backendApi, responseContract }) => {
    const loginResponse = await backendApi.auth.login(newUserLoginPayload);
    loginResponseBody = await responseContract.validate(loginResponse, httpStatus.OK, LoginResponseSchema);
    createdUserId = jwtHelper.decode(loginResponseBody.token).sub;
    const createResponse = await backendApi.searchProfiles.create(loginResponseBody.token, payloadWithUnknownField);

    expect(createResponse.status(), 'A body with an unknown field should be rejected with 400 (ValidationPipe forbidNonWhitelisted)').toBe(
      httpStatus.BAD_REQUEST,
    );
  });
});
