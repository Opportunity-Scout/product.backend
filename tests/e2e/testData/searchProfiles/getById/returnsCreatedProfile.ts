import { randomUUID } from 'crypto';
import { TelegramLoginFields } from '@/api/auth/interfaces';
import { CreateSearchProfilePayload } from '@/api/searchProfiles/interfaces';

const newUserLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_get_profile_by_id_${Date.now()}`,
};

const createSearchProfilePayload: CreateSearchProfilePayload = {
  name: 'e2e_Get By Id Profile',
  preferences: {
    location: { remote: true },
  },
};

export default {
  newUserLoginPayload,
  createSearchProfilePayload,
};
