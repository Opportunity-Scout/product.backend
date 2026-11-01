import { SearchPreferencesPayload } from './SearchPreferencesPayload';

export interface UpdateSearchProfilePayload {
  name?: string;
  description?: string | null;
  preferences?: SearchPreferencesPayload;
}
