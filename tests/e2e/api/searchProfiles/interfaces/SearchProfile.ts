import { SearchProfileStatus } from '../types/SearchProfileStatus';
import { SearchPreferences } from './SearchPreferences';

export interface SearchProfile {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: SearchProfileStatus;
  preferences: SearchPreferences;
  createdAt: string;
  updatedAt: string;
  lastMatchedAt: string | null;
}
