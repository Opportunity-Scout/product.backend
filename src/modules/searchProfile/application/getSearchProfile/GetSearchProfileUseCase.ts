import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@app/common/kernel/Result';
import { SearchProfile } from '../../domain/SearchProfile';
import { SEARCH_PROFILE_REPOSITORY, SearchProfileRepository } from '../ports/SearchProfileRepository';
import { SearchProfileNotFoundError } from '../errors/SearchProfileNotFoundError';
import { GetSearchProfileInput } from './interfaces/GetSearchProfileInput';

@Injectable()
export class GetSearchProfileUseCase {
  constructor(
    @Inject(SEARCH_PROFILE_REPOSITORY)
    private readonly searchProfileRepository: SearchProfileRepository,
  ) {}

  async execute(input: GetSearchProfileInput): Promise<Result<SearchProfile, SearchProfileNotFoundError>> {
    const searchProfile = await this.searchProfileRepository.findById(input.id);

    if (!searchProfile || searchProfile.userId !== input.userId) {
      return Result.fail(new SearchProfileNotFoundError(input.id));
    }

    return Result.ok(searchProfile);
  }
}
