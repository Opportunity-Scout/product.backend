import { SearchPreferences } from '../SearchPreferences';

export interface CreateSearchProfileProps {
  userId: string;
  name: string;
  description?: string;
  preferences: SearchPreferences;
}
