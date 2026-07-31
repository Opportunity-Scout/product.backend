import { SearchPreferencesProps } from '@app/modules/searchProfile/domain/interfaces/SearchPreferencesProps';

export interface BuildSearchProfileOverrides {
  name?: string;
  description?: string;
  preferences?: SearchPreferencesProps;
}
