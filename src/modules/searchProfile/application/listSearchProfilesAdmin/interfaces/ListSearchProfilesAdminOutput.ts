import { SearchProfile } from '../../../domain/SearchProfile';

export interface ListSearchProfilesAdminOutput {
  searchProfiles: SearchProfile[];
  total: number;
}
