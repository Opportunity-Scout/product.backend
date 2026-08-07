import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@app/common/kernel/Result';
import { SearchProfile } from '../../domain/SearchProfile';
import { InvalidSearchProfileStatusTransitionError } from '../../domain/errors/InvalidSearchProfileStatusTransitionError';
import { SEARCH_PROFILE_REPOSITORY, SearchProfileRepository } from '../ports/SearchProfileRepository';
import { SearchProfileNotFoundError } from '../errors/SearchProfileNotFoundError';
import { ActivateSearchProfileInput } from './interfaces/ActivateSearchProfileInput';

@Injectable()
export class ActivateSearchProfileUseCase {
  constructor(
    @Inject(SEARCH_PROFILE_REPOSITORY)
    private readonly searchProfileRepository: SearchProfileRepository,
  ) {}

  async execute(
    input: ActivateSearchProfileInput,
  ): Promise<Result<SearchProfile, SearchProfileNotFoundError | InvalidSearchProfileStatusTransitionError>> {
    const searchProfile = await this.searchProfileRepository.findById(input.id);

    if (!searchProfile || searchProfile.userId !== input.userId) {
      return Result.fail(new SearchProfileNotFoundError(input.id));
    }

    const activatedResult = searchProfile.activate();

    if (activatedResult.isFailure) {
      return Result.fail(activatedResult.error);
    }

    await this.searchProfileRepository.save(activatedResult.value);

    return Result.ok(activatedResult.value);
  }
}
