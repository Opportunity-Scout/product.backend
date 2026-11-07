import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@app/common/kernel/Result';
import { UNIT_OF_WORK, UnitOfWork } from '@app/common/unitOfWork/UnitOfWork';
import {
  SEARCH_PROFILE_REPOSITORY,
  SearchProfileRepository,
} from '@app/modules/searchProfile/application/ports/SearchProfileRepository';
import { USER_REPOSITORY, UserRepository } from '../ports/UserRepository';
import { UserAccessService } from '../UserAccessService';
import { UserNotFoundError } from '../errors/UserNotFoundError';
import { DeleteUserInput } from './interfaces/DeleteUserInput';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(SEARCH_PROFILE_REPOSITORY)
    private readonly searchProfileRepository: SearchProfileRepository,
    private readonly userAccessService: UserAccessService,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: DeleteUserInput): Promise<Result<void, UserNotFoundError>> {
    return this.unitOfWork.run(async (): Promise<Result<void, UserNotFoundError>> => {
      // Locks the user row so a concurrent profile create waits instead of leaving an orphan profile.
      const user = await this.userRepository.findByIdForUpdate(input.id);

      if (!user) {
        return Result.fail(new UserNotFoundError(input.id));
      }

      // Same 404 as a nonexistent id either way — a non-owning, non-admin
      // caller can't tell "not yours" from "doesn't exist".
      if (!(await this.userAccessService.isOwnerOrAdmin(user.id, input.callerId))) {
        return Result.fail(new UserNotFoundError(input.id));
      }

      await this.searchProfileRepository.deleteAllByUserId(user.id);
      await this.userRepository.deleteById(user.id);

      return Result.ok(undefined);
    });
  }
}
