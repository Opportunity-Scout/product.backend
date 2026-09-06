import { randomUUID } from 'crypto';
import { TelegramLoginFields } from '@/api/auth/interfaces';

const newLimit = 5;
const newUserLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_set_limit_forbidden_${Date.now()}`,
};

export default {
  newUserLoginPayload,
  newLimit,
};
