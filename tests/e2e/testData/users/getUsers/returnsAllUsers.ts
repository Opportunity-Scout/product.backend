import { randomUUID } from 'crypto';
import { TelegramLoginFields } from '../../../api/auth/interfaces';

const minimumExpectedUserCount = 2;
const newUserLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_get_users_no_filter_${Date.now()}`,
};

export default {
  newUserLoginPayload,
  minimumExpectedUserCount,
};
