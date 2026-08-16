import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@app/common/kernel/Result';
import { UserAccessService } from '@app/modules/user/application/UserAccessService';
import { SearchProfile } from '../../domain/SearchProfile';
import { SEARCH_PROFILE_REPOSITORY, SearchProfileRepository } from '../ports/SearchProfileRepository';
import { SearchProfileNotFoundError } from '../errors/SearchProfileNotFoundError';
import { GetSearchProfileInput } from './interfaces/GetSearchProfileInput';

@Injectable()
export class GetSearchProfileUseCase {
  constructor(
    @Inject(SEARCH_PROFILE_REPOSITORY)
    private readonly searchProfileRepository: SearchProfileRepository,
    private readonly userAccessService: UserAccessService,
  ) {}

  async execute(input: GetSearchProfileInput): Promise<Result<SearchProfile, SearchProfileNotFoundError>> {
    const searchProfile = await this.searchProfileRepository.findById(input.id);

    if (!searchProfile || !(await this.userAccessService.isOwnerOrAdmin(searchProfile.userId, input.callerId))) {
      return Result.fail(new SearchProfileNotFoundError(input.id));
    }

    return Result.ok(searchProfile);
  }
}
