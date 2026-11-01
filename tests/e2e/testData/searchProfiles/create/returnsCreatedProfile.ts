import { randomUUID } from 'crypto';
import { TelegramLoginFields } from '@/api/auth/interfaces';
import { CreateSearchProfilePayload, CompanyFilter, SalaryExpectation } from '@/api/searchProfiles/interfaces';

const expectedDefaultCompensation: SalaryExpectation = { minimumSalary: null, currency: null };
const expectedDefaultSeniority: string[] = [];
const expectedDefaultEmploymentTypes: string[] = [];
const expectedDefaultCompanies: CompanyFilter = { include: [], exclude: [] };
const expectedDefaultSources: string[] = [];

const newUserLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_create_search_profile_${Date.now()}`,
};

const createSearchProfilePayload: CreateSearchProfilePayload = {
  name: 'e2e_Backend Prague',
  description: 'e2e test search profile',
  preferences: {
    keywords: { include: ['nestjs', 'node'], exclude: ['php'] },
    location: { countries: ['CZ'], cities: ['Prague'], remote: true, relocation: false },
  },
};

export default {
  newUserLoginPayload,
  createSearchProfilePayload,
  expectedDefaultCompensation,
  expectedDefaultSeniority,
  expectedDefaultEmploymentTypes,
  expectedDefaultCompanies,
  expectedDefaultSources,
};
