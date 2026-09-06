import { randomUUID } from 'crypto';
import { TelegramLoginFields } from '@/api/auth/interfaces';

const zeroEntitiesCount = 0;
const newUserLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_delete_self_${Date.now()}`,
};

export default {
  newUserLoginPayload,
  zeroEntitiesCount,
};
