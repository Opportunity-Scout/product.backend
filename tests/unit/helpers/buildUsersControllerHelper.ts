import { UsersController } from '@app/modules/user/presentation/UsersController';
import { SetSearchProfileLimitUseCase } from '@app/modules/user/application/setSearchProfileLimit/SetSearchProfileLimitUseCase';
import { ListUsersUseCase } from '@app/modules/user/application/listUsers/ListUsersUseCase';
import { DeleteUserUseCase } from '@app/modules/user/application/deleteUser/DeleteUserUseCase';
import { UserAccessService } from '@app/modules/user/application/UserAccessService';
import { UserRepository } from '@app/modules/user/application/ports/UserRepository';
import { SearchProfileRepository } from '@app/modules/searchProfile/application/ports/SearchProfileRepository';
import { FakeUserRepository } from './fakeUserRepositoryHelper';
import { FakeSearchProfileRepository } from './fakeSearchProfileRepositoryHelper';

export function buildUsersController(
  repository: UserRepository = new FakeUserRepository(),
  searchProfileRepository: SearchProfileRepository = new FakeSearchProfileRepository(),
): UsersController {
  const userAccessService = new UserAccessService(repository);

  return new UsersController(
    new SetSearchProfileLimitUseCase(repository),
    new ListUsersUseCase(repository),
    new DeleteUserUseCase(repository, searchProfileRepository, userAccessService),
  );
}
