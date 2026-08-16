import { Inject, Injectable } from '@nestjs/common';
import { SEARCH_PROFILE_REPOSITORY, SearchProfileRepository } from '../ports/SearchProfileRepository';
import { ListSearchProfilesAdminInput } from './interfaces/ListSearchProfilesAdminInput';
import { ListSearchProfilesAdminOutput } from './interfaces/ListSearchProfilesAdminOutput';

@Injectable()
export class ListSearchProfilesAdminUseCase {
  constructor(
    @Inject(SEARCH_PROFILE_REPOSITORY)
    private readonly searchProfileRepository: SearchProfileRepository,
  ) {}

  execute(input: ListSearchProfilesAdminInput): Promise<ListSearchProfilesAdminOutput> {
    return this.searchProfileRepository.findMany(input);
  }
}
