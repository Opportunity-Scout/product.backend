import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@app/common/kernel/Result';
import { User } from '../../domain/User';
import { InvalidSearchProfileLimitError } from '../../domain/errors/InvalidSearchProfileLimitError';
import { USER_REPOSITORY, UserRepository } from '../ports/UserRepository';
import { UserNotFoundError } from '../errors/UserNotFoundError';
import { SetSearchProfileLimitInput } from './interfaces/SetSearchProfileLimitInput';

@Injectable()
export class SetSearchProfileLimitUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    input: SetSearchProfileLimitInput,
  ): Promise<Result<User, UserNotFoundError | InvalidSearchProfileLimitError>> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      return Result.fail(new UserNotFoundError(input.userId));
    }

    const updatedResult = user.setSearchProfileLimit(input.limit);

    if (updatedResult.isFailure) {
      return Result.fail(updatedResult.error);
    }

    await this.userRepository.save(updatedResult.value);

    return Result.ok(updatedResult.value);
  }
}
