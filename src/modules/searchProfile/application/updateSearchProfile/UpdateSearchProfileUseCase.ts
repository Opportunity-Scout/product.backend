import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@app/common/kernel/Result';
import { DomainError } from '@app/common/kernel/DomainError';
import { UserAccessService } from '@app/modules/user/application/UserAccessService';
import { SearchProfile } from '../../domain/SearchProfile';
import { SearchPreferences } from '../../domain/SearchPreferences';
import { SEARCH_PROFILE_REPOSITORY, SearchProfileRepository } from '../ports/SearchProfileRepository';
import { SearchProfileNotFoundError } from '../errors/SearchProfileNotFoundError';
import { UpdateSearchProfileInput } from './interfaces/UpdateSearchProfileInput';

@Injectable()
export class UpdateSearchProfileUseCase {
  constructor(
    @Inject(SEARCH_PROFILE_REPOSITORY)
    private readonly searchProfileRepository: SearchProfileRepository,
    private readonly userAccessService: UserAccessService,
  ) {}

  async execute(
    input: UpdateSearchProfileInput,
  ): Promise<Result<SearchProfile, SearchProfileNotFoundError | DomainError>> {
    const searchProfile = await this.searchProfileRepository.findById(input.id);

    if (!searchProfile || !(await this.userAccessService.isOwnerOrAdmin(searchProfile.userId, input.callerId))) {
      return Result.fail(new SearchProfileNotFoundError(input.id));
    }

    let preferences: SearchPreferences | undefined;

    if (input.preferences !== undefined) {
      const preferencesResult = SearchPreferences.create(input.preferences);

      if (preferencesResult.isFailure) {
        return Result.fail(preferencesResult.error);
      }

      preferences = preferencesResult.value;
    }

    const updatedResult = searchProfile.updateDetails({
      name: input.name,
      description: input.description,
      preferences,
    });

    if (updatedResult.isFailure) {
      return Result.fail(updatedResult.error);
    }

    await this.searchProfileRepository.save(updatedResult.value);

    return Result.ok(updatedResult.value);
  }
}
