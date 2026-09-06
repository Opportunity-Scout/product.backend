import { randomUUID } from 'crypto';
import { TelegramLoginFields } from '@/api/auth/interfaces';

const newUserLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_get_users_forbidden_${Date.now()}`,
};

export default {
  newUserLoginPayload,
};
