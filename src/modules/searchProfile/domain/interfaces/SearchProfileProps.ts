import { SearchPreferences } from '../SearchPreferences';
import { SearchProfileStatus } from '../types/SearchProfileStatus';

export interface SearchProfileProps {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: SearchProfileStatus;
  preferences: SearchPreferences;
  createdAt: Date;
  updatedAt: Date;
  lastMatchedAt: Date | null;
}
