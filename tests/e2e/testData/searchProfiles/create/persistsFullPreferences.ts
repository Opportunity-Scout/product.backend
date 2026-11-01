import { randomUUID } from 'crypto';
import { TelegramLoginFields } from '@/api/auth/interfaces';
import { CreateSearchProfilePayload } from '@/api/searchProfiles/interfaces';

const newUserLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_full_preferences_${Date.now()}`,
};

const createSearchProfilePayload: CreateSearchProfilePayload = {
  name: 'e2e_Full Preferences Profile',
  description: 'e2e full preferences payload',
  preferences: {
    keywords: { include: ['nestjs', 'node'], exclude: ['php'] },
    location: { countries: ['CZ', 'PL'], cities: ['Prague', 'Warsaw'], remote: false, relocation: true },
    compensation: { minimumSalary: 3000, currency: 'EUR' },
    seniority: ['middle', 'senior'],
    employmentTypes: ['full_time', 'contract'],
    companies: { include: ['Acme'], exclude: ['Globex'] },
    sources: ['dou'],
  },
};

export default {
  newUserLoginPayload,
  createSearchProfilePayload,
};
