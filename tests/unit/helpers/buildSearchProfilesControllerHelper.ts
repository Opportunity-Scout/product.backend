import { SearchProfilesController } from '@app/modules/searchProfile/presentation/SearchProfilesController';
import { CreateSearchProfileUseCase } from '@app/modules/searchProfile/application/createSearchProfile/CreateSearchProfileUseCase';
import { GetSearchProfileUseCase } from '@app/modules/searchProfile/application/getSearchProfile/GetSearchProfileUseCase';
import { ListSearchProfilesUseCase } from '@app/modules/searchProfile/application/listSearchProfiles/ListSearchProfilesUseCase';
import { PauseSearchProfileUseCase } from '@app/modules/searchProfile/application/pauseSearchProfile/PauseSearchProfileUseCase';
import { ActivateSearchProfileUseCase } from '@app/modules/searchProfile/application/activateSearchProfile/ActivateSearchProfileUseCase';
import { ArchiveSearchProfileUseCase } from '@app/modules/searchProfile/application/archiveSearchProfile/ArchiveSearchProfileUseCase';
import { UpdateSearchProfileUseCase } from '@app/modules/searchProfile/application/updateSearchProfile/UpdateSearchProfileUseCase';
import { SearchProfileRepository } from '@app/modules/searchProfile/application/ports/SearchProfileRepository';
import { FakeSearchProfileRepository } from './fakeSearchProfileRepositoryHelper';

export function buildSearchProfilesController(
  repository: SearchProfileRepository = new FakeSearchProfileRepository(),
): SearchProfilesController {
  return new SearchProfilesController(
    new CreateSearchProfileUseCase(repository),
    new GetSearchProfileUseCase(repository),
    new ListSearchProfilesUseCase(repository),
    new PauseSearchProfileUseCase(repository),
    new ActivateSearchProfileUseCase(repository),
    new ArchiveSearchProfileUseCase(repository),
    new UpdateSearchProfileUseCase(repository),
  );
}
