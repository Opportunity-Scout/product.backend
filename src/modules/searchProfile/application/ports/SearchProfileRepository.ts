import { SearchProfile } from '../../domain/SearchProfile';

export const SEARCH_PROFILE_REPOSITORY = Symbol('SEARCH_PROFILE_REPOSITORY');

export interface SearchProfileRepository {
  save(searchProfile: SearchProfile): Promise<void>;
  findById(id: string): Promise<SearchProfile | null>;
  findAllByUserId(userId: string): Promise<SearchProfile[]>;
}
