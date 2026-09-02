import { randomUUID } from 'crypto';
import { TelegramLoginFields } from '../../../api/auth/interfaces';

const zeroLimit = 0;
const newUserLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_set_limit_zero_${Date.now()}`,
};

export default {
  newUserLoginPayload,
  zeroLimit,
};
