import { SearchProfile } from '../../../domain/SearchProfile';

export interface FindManySearchProfilesResult {
  searchProfiles: SearchProfile[];
  total: number;
}
