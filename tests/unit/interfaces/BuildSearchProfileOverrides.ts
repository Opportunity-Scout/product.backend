import { SearchPreferencesProps } from '@app/modules/searchProfile/domain/interfaces/SearchPreferencesProps';

export interface BuildSearchProfileOverrides {
  userId?: string;
  name?: string;
  description?: string;
  preferences?: SearchPreferencesProps;
}
