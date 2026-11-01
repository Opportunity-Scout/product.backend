import { CreateSearchProfilePayload } from '@/api/searchProfiles/interfaces';

const invalidAccessToken = 'not-a-real-token';

const createSearchProfilePayload: CreateSearchProfilePayload = {
  name: 'e2e_Invalid Token Attempt',
  preferences: { location: { remote: true } },
};

export default {
  invalidAccessToken,
  createSearchProfilePayload,
};
