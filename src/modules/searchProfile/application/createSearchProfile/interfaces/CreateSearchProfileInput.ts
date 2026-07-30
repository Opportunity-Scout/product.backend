import { SearchPreferencesProps } from '../../../domain/interfaces/SearchPreferencesProps';

export interface CreateSearchProfileInput {
  userId: string;
  name: string;
  description?: string;
  preferences: SearchPreferencesProps;
}
