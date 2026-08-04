import { Inject, Injectable } from '@nestjs/common';
import { SearchProfile } from '../../domain/SearchProfile';
import { SEARCH_PROFILE_REPOSITORY, SearchProfileRepository } from '../ports/SearchProfileRepository';
import { ListSearchProfilesInput } from './interfaces/ListSearchProfilesInput';

@Injectable()
export class ListSearchProfilesUseCase {
  constructor(
    @Inject(SEARCH_PROFILE_REPOSITORY)
    private readonly searchProfileRepository: SearchProfileRepository,
  ) {}

  execute(input: ListSearchProfilesInput): Promise<SearchProfile[]> {
    return this.searchProfileRepository.findAllByUserId(input.userId);
  }
}
