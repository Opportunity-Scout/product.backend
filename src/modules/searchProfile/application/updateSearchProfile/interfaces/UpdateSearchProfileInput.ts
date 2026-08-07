import { SearchPreferencesProps } from '../../../domain/interfaces/SearchPreferencesProps';

export interface UpdateSearchProfileInput {
  id: string;
  userId: string;
  name?: string;
  description?: string | null;
  preferences?: SearchPreferencesProps;
}
