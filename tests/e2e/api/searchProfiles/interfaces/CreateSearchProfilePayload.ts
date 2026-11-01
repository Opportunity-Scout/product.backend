import { SearchPreferencesPayload } from './SearchPreferencesPayload';

export interface CreateSearchProfilePayload {
  name: string;
  description?: string;
  preferences: SearchPreferencesPayload;
}
