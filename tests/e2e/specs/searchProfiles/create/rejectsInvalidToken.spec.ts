import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';
import testData from '@/testData/searchProfiles/create/rejectsInvalidToken';

test.describe('POST /search-profiles → rejects invalid token', () => {
  const { invalidAccessToken, createSearchProfilePayload } = testData;

  test('Rejects a request with an invalid bearer token', { tag: '@T436ba7d5' }, async ({ backendApi }) => {
    const createResponse = await backendApi.searchProfiles.create(invalidAccessToken, createSearchProfilePayload);

    expect(createResponse.status(), 'A request with an invalid bearer token should be rejected with 401').toBe(httpStatus.UNAUTHORIZED);
  });
});
