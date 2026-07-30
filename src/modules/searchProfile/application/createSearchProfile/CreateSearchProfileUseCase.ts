import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@app/common/kernel/Result';
import { DomainError } from '@app/common/kernel/DomainError';
import { SearchPreferences } from '../../domain/SearchPreferences';
import { SearchProfile } from '../../domain/SearchProfile';
import { SEARCH_PROFILE_REPOSITORY, SearchProfileRepository } from '../ports/SearchProfileRepository';
import { CreateSearchProfileInput } from './interfaces/CreateSearchProfileInput';

@Injectable()
export class CreateSearchProfileUseCase {
  constructor(
    @Inject(SEARCH_PROFILE_REPOSITORY)
    private readonly searchProfileRepository: SearchProfileRepository,
  ) {}

  async execute(input: CreateSearchProfileInput): Promise<Result<SearchProfile, DomainError>> {
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
