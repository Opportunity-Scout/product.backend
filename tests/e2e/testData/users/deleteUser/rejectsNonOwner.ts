import { randomUUID } from 'crypto';
import { TelegramLoginFields } from '../../../api/auth/interfaces';

const victimLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_delete_victim_${Date.now()}`,
};

const attackerLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_delete_attacker_${Date.now()}`,
};

export default {
  victimLoginPayload,
  attackerLoginPayload,
};
