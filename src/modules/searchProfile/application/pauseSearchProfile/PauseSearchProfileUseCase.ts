import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@app/common/kernel/Result';
import { SearchProfile } from '../../domain/SearchProfile';
import { InvalidSearchProfileStatusTransitionError } from '../../domain/errors/InvalidSearchProfileStatusTransitionError';
import { SEARCH_PROFILE_REPOSITORY, SearchProfileRepository } from '../ports/SearchProfileRepository';
import { SearchProfileNotFoundError } from '../errors/SearchProfileNotFoundError';
import { PauseSearchProfileInput } from './interfaces/PauseSearchProfileInput';

@Injectable()
export class PauseSearchProfileUseCase {
  constructor(
    @Inject(SEARCH_PROFILE_REPOSITORY)
    private readonly searchProfileRepository: SearchProfileRepository,
  ) {}

  async execute(
    input: PauseSearchProfileInput,
  ): Promise<Result<SearchProfile, SearchProfileNotFoundError | InvalidSearchProfileStatusTransitionError>> {
    const searchProfile = await this.searchProfileRepository.findById(input.id);

    if (!searchProfile) {
      return Result.fail(new SearchProfileNotFoundError(input.id));
    }

    const pausedResult = searchProfile.pause();

    if (pausedResult.isFailure) {
      return Result.fail(pausedResult.error);
    }

    await this.searchProfileRepository.save(pausedResult.value);

    return Result.ok(pausedResult.value);
  }
}
