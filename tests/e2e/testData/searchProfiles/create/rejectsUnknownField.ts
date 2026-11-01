import { randomUUID } from 'crypto';
import { TelegramLoginFields } from '@/api/auth/interfaces';

const newUserLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_unknown_field_${Date.now()}`,
};

// Deliberately not typed as CreateSearchProfilePayload — `criteria` is the unknown field under test.
const payloadWithUnknownField = {
  name: 'e2e_Unknown Field Profile',
  preferences: { location: { remote: true } },
  criteria: { remote: true },
};

export default {
  newUserLoginPayload,
  payloadWithUnknownField,
};
