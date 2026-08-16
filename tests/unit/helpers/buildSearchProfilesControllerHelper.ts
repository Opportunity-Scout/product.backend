import { SearchProfilesController } from '@app/modules/searchProfile/presentation/SearchProfilesController';
import { CreateSearchProfileUseCase } from '@app/modules/searchProfile/application/createSearchProfile/CreateSearchProfileUseCase';
import { GetSearchProfileUseCase } from '@app/modules/searchProfile/application/getSearchProfile/GetSearchProfileUseCase';
import { ListSearchProfilesUseCase } from '@app/modules/searchProfile/application/listSearchProfiles/ListSearchProfilesUseCase';
import { ListSearchProfilesAdminUseCase } from '@app/modules/searchProfile/application/listSearchProfilesAdmin/ListSearchProfilesAdminUseCase';
import { PauseSearchProfileUseCase } from '@app/modules/searchProfile/application/pauseSearchProfile/PauseSearchProfileUseCase';
import { ActivateSearchProfileUseCase } from '@app/modules/searchProfile/application/activateSearchProfile/ActivateSearchProfileUseCase';
import { ArchiveSearchProfileUseCase } from '@app/modules/searchProfile/application/archiveSearchProfile/ArchiveSearchProfileUseCase';
import { UpdateSearchProfileUseCase } from '@app/modules/searchProfile/application/updateSearchProfile/UpdateSearchProfileUseCase';
import { DeleteSearchProfileUseCase } from '@app/modules/searchProfile/application/deleteSearchProfile/DeleteSearchProfileUseCase';
import { SearchProfileRepository } from '@app/modules/searchProfile/application/ports/SearchProfileRepository';
import { UserAccessService } from '@app/modules/user/application/UserAccessService';
import { UserRepository } from '@app/modules/user/application/ports/UserRepository';
import { FakeSearchProfileRepository } from './fakeSearchProfileRepositoryHelper';
import { FakeUserRepository } from './fakeUserRepositoryHelper';
import { buildUser } from './buildUserHelper';

function buildDefaultUserRepository(): FakeUserRepository {
  const repository = new FakeUserRepository();
  repository.saved.push(buildUser({ id: 'user-1' }));

  return repository;
}

export function buildSearchProfilesController(
  repository: SearchProfileRepository = new FakeSearchProfileRepository(),
  userRepository: UserRepository = buildDefaultUserRepository(),
): SearchProfilesController {
  const userAccessService = new UserAccessService(userRepository);

  return new SearchProfilesController(
    new CreateSearchProfileUseCase(repository, userRepository),
    new GetSearchProfileUseCase(repository, userAccessService),
    new ListSearchProfilesUseCase(repository),
    new ListSearchProfilesAdminUseCase(repository),
    new PauseSearchProfileUseCase(repository),
    new ActivateSearchProfileUseCase(repository),
    new ArchiveSearchProfileUseCase(repository),
    new UpdateSearchProfileUseCase(repository, userAccessService),
    new DeleteSearchProfileUseCase(repository, userAccessService),
  );
}
