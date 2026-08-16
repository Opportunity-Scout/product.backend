import { SearchProfile } from '../../domain/SearchProfile';
import { FindManySearchProfilesParams } from './interfaces/FindManySearchProfilesParams';
import { FindManySearchProfilesResult } from './interfaces/FindManySearchProfilesResult';

export const SEARCH_PROFILE_REPOSITORY = Symbol('SEARCH_PROFILE_REPOSITORY');

export interface SearchProfileRepository {
  save(searchProfile: SearchProfile): Promise<void>;
  findById(id: string): Promise<SearchProfile | null>;
  findAllByUserId(userId: string): Promise<SearchProfile[]>;
  deleteById(id: string): Promise<void>;
  deleteAllByUserId(userId: string): Promise<void>;
  findMany(params: FindManySearchProfilesParams): Promise<FindManySearchProfilesResult>;
}
