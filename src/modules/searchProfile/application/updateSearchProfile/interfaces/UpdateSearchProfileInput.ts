import { SearchPreferencesProps } from '../../../domain/interfaces/SearchPreferencesProps';

export interface UpdateSearchProfileInput {
  id: string;
  name?: string;
  description?: string | null;
  preferences?: SearchPreferencesProps;
}
