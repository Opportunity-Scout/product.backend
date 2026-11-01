import { test, expect } from '@/fixtures/test';
import { httpStatus } from '@/constants';
import testData from '@/testData/searchProfiles/getById/rejectsInvalidId';

test.describe('GET /search-profiles/:id → rejects invalid id', () => {
  const { malformedId } = testData;

  test('Rejects a malformed id with 400', { tag: '@T497475c2' }, async ({ backendApi, apiHelper }) => {
    const adminAccessToken = await apiHelper.getAdminAccessToken();
    const getResponse = await backendApi.searchProfiles.getById(adminAccessToken, malformedId);

    expect(getResponse.status(), 'A malformed id should be rejected with 400 (ParseUUIDPipe)').toBe(httpStatus.BAD_REQUEST);
  });
});
