import { randomUUID } from 'crypto';
import { TelegramLoginFields } from '@/api/auth/interfaces';
import { CreateSearchProfilePayload, UpdateSearchProfilePayload } from '@/api/searchProfiles/interfaces';

const newUserLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_update_partial_${Date.now()}`,
};

const createSearchProfilePayload: CreateSearchProfilePayload = {
  name: 'e2e_Original Name',
  description: 'e2e original description',
  preferences: {
    keywords: { include: ['nestjs'], exclude: ['php'] },
    location: { countries: ['CZ'], cities: ['Prague'], remote: true, relocation: false },
  },
};

const updateNamePayload: UpdateSearchProfilePayload = {
  name: 'e2e_Updated Name',
};

export default {
  newUserLoginPayload,
  createSearchProfilePayload,
  updateNamePayload,
};
