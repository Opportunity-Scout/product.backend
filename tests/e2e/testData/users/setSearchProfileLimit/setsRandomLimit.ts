import { randomUUID } from 'crypto';
import { TelegramLoginFields } from '../../../api/auth/interfaces';
import { commonHelper } from '../../../helpers/commonHelper';

const randomLimitMin = 1;
const randomLimitMax = 1000;
const randomLimit = commonHelper.randomInt(randomLimitMin, randomLimitMax);
const newUserLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_set_limit_random_${Date.now()}`,
};

export default {
  randomLimit,
  newUserLoginPayload,
};
