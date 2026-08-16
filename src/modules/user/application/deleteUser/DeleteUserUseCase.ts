import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@app/common/kernel/Result';
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
  ) {}

  async execute(input: DeleteUserInput): Promise<Result<void, UserNotFoundError>> {
    const user = await this.userRepository.findById(input.id);

    if (!user) {
      return Result.fail(new UserNotFoundError(input.id));
    }

    // Same 404 as a nonexistent id either way — a non-owning, non-admin
    // caller can't tell "not yours" from "doesn't exist".
    if (!(await this.userAccessService.isOwnerOrAdmin(user.id, input.callerId))) {
      return Result.fail(new UserNotFoundError(input.id));
    }

    // Profiles first, deliberately not transactional — see CLAUDE.md
    // "Self-service account deletion" for the crash-vs-race tradeoff behind the order.
    await this.searchProfileRepository.deleteAllByUserId(user.id);
    await this.userRepository.deleteById(user.id);

    return Result.ok(undefined);
  }
}
