import { SearchPreferences } from '../SearchPreferences';

export interface UpdateSearchProfileDetailsInput {
  name?: string;
  description?: string | null;
  preferences?: SearchPreferences;
}
