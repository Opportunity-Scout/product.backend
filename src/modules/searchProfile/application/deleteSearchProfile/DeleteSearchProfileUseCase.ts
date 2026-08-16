import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@app/common/kernel/Result';
import { UserAccessService } from '@app/modules/user/application/UserAccessService';
import { SEARCH_PROFILE_REPOSITORY, SearchProfileRepository } from '../ports/SearchProfileRepository';
import { SearchProfileNotFoundError } from '../errors/SearchProfileNotFoundError';
import { DeleteSearchProfileInput } from './interfaces/DeleteSearchProfileInput';

@Injectable()
export class DeleteSearchProfileUseCase {
  constructor(
    @Inject(SEARCH_PROFILE_REPOSITORY)
    private readonly searchProfileRepository: SearchProfileRepository,
    private readonly userAccessService: UserAccessService,
  ) {}

  async execute(input: DeleteSearchProfileInput): Promise<Result<void, SearchProfileNotFoundError>> {
    const searchProfile = await this.searchProfileRepository.findById(input.id);

    if (!searchProfile || !(await this.userAccessService.isOwnerOrAdmin(searchProfile.userId, input.callerId))) {
      return Result.fail(new SearchProfileNotFoundError(input.id));
    }

    await this.searchProfileRepository.deleteById(searchProfile.id);

    return Result.ok(undefined);
  }
}
