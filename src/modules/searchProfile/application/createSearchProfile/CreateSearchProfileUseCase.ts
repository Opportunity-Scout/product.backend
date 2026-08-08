import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@app/common/kernel/Result';
import { DomainError } from '@app/common/kernel/DomainError';
import { USER_REPOSITORY, UserRepository } from '@app/modules/user/application/ports/UserRepository';
import { UserNotFoundError } from '@app/modules/user/application/errors/UserNotFoundError';
import { SearchPreferences } from '../../domain/SearchPreferences';
import { SearchProfile } from '../../domain/SearchProfile';
import { SEARCH_PROFILE_REPOSITORY, SearchProfileRepository } from '../ports/SearchProfileRepository';
import { SearchProfileLimitExceededError } from '../errors/SearchProfileLimitExceededError';
import { CreateSearchProfileInput } from './interfaces/CreateSearchProfileInput';

@Injectable()
export class CreateSearchProfileUseCase {
  constructor(
    @Inject(SEARCH_PROFILE_REPOSITORY)
    private readonly searchProfileRepository: SearchProfileRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: CreateSearchProfileInput): Promise<Result<SearchProfile, DomainError>> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      return Result.fail(new UserNotFoundError(input.userId));
    }

    const existingProfiles = await this.searchProfileRepository.findAllByUserId(input.userId);
    const activeOrPausedCount = existingProfiles.filter(
      (profile) => profile.status === 'active' || profile.status === 'paused',
    ).length;

    if (activeOrPausedCount >= user.searchProfileLimit) {
      return Result.fail(new SearchProfileLimitExceededError(input.userId, user.searchProfileLimit));
    }

    const preferencesResult = SearchPreferences.create(input.preferences);

    if (preferencesResult.isFailure) {
      return Result.fail(preferencesResult.error);
    }

    const searchProfileResult = SearchProfile.create({
      userId: input.userId,
      name: input.name,
      description: input.description,
      preferences: preferencesResult.value,
    });

    if (searchProfileResult.isFailure) {
      return Result.fail(searchProfileResult.error);
    }

    await this.searchProfileRepository.save(searchProfileResult.value);

    return Result.ok(searchProfileResult.value);
  }
}
