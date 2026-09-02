import { randomUUID } from 'crypto';
import { TelegramLoginFields } from '../../../api/auth/interfaces';

const expectedEntitiesCount = 1;
const newUserLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_get_users_${Date.now()}`,
};

export default {
  newUserLoginPayload,
  expectedEntitiesCount,
};
