import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@app/common/kernel/Result';
import { SearchProfile } from '../../domain/SearchProfile';
import { InvalidSearchProfileStatusTransitionError } from '../../domain/errors/InvalidSearchProfileStatusTransitionError';
import { SEARCH_PROFILE_REPOSITORY, SearchProfileRepository } from '../ports/SearchProfileRepository';
import { SearchProfileNotFoundError } from '../errors/SearchProfileNotFoundError';
import { ArchiveSearchProfileInput } from './interfaces/ArchiveSearchProfileInput';

@Injectable()
export class ArchiveSearchProfileUseCase {
  constructor(
    @Inject(SEARCH_PROFILE_REPOSITORY)
    private readonly searchProfileRepository: SearchProfileRepository,
  ) {}

  async execute(
    input: ArchiveSearchProfileInput,
  ): Promise<Result<SearchProfile, SearchProfileNotFoundError | InvalidSearchProfileStatusTransitionError>> {
    const searchProfile = await this.searchProfileRepository.findById(input.id);

    if (!searchProfile) {
      return Result.fail(new SearchProfileNotFoundError(input.id));
    }

    const archivedResult = searchProfile.archive();

    if (archivedResult.isFailure) {
      return Result.fail(archivedResult.error);
    }

    await this.searchProfileRepository.save(archivedResult.value);

    return Result.ok(archivedResult.value);
  }
}
