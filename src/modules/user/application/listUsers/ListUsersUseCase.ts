import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../ports/UserRepository';
import { ListUsersInput } from './interfaces/ListUsersInput';
import { ListUsersOutput } from './interfaces/ListUsersOutput';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  execute(input: ListUsersInput): Promise<ListUsersOutput> {
    return this.userRepository.findMany(input);
  }
}
