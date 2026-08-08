import { UsersController } from '@app/modules/user/presentation/UsersController';
import { SetSearchProfileLimitUseCase } from '@app/modules/user/application/setSearchProfileLimit/SetSearchProfileLimitUseCase';
import { UserRepository } from '@app/modules/user/application/ports/UserRepository';
import { FakeUserRepository } from './fakeUserRepositoryHelper';

export function buildUsersController(repository: UserRepository = new FakeUserRepository()): UsersController {
  return new UsersController(new SetSearchProfileLimitUseCase(repository));
}
