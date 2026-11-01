import { randomUUID } from 'crypto';
import { TelegramLoginFields } from '@/api/auth/interfaces';
import { CreateSearchProfilePayload } from '@/api/searchProfiles/interfaces';

const victimLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_get_by_id_victim_${Date.now()}`,
};

const attackerLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_get_by_id_attacker_${Date.now()}`,
};

const createSearchProfilePayload: CreateSearchProfilePayload = {
  name: 'e2e_Victim Profile',
  preferences: {
    location: { remote: true },
  },
};

export default {
  victimLoginPayload,
  attackerLoginPayload,
  createSearchProfilePayload,
};
