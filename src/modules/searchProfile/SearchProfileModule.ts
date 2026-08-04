import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/common/persistence/PrismaModule';
import { SearchProfilesController } from './presentation/SearchProfilesController';
import { CreateSearchProfileUseCase } from './application/createSearchProfile/CreateSearchProfileUseCase';
import { GetSearchProfileUseCase } from './application/getSearchProfile/GetSearchProfileUseCase';
import { ListSearchProfilesUseCase } from './application/listSearchProfiles/ListSearchProfilesUseCase';
import { PauseSearchProfileUseCase } from './application/pauseSearchProfile/PauseSearchProfileUseCase';
import { ActivateSearchProfileUseCase } from './application/activateSearchProfile/ActivateSearchProfileUseCase';
import { ArchiveSearchProfileUseCase } from './application/archiveSearchProfile/ArchiveSearchProfileUseCase';
import { UpdateSearchProfileUseCase } from './application/updateSearchProfile/UpdateSearchProfileUseCase';
import { SEARCH_PROFILE_REPOSITORY } from './application/ports/SearchProfileRepository';
import { PrismaSearchProfileAdapter } from './infrastructure/persistence/PrismaSearchProfileAdapter';

@Module({
  imports: [PrismaModule],
  controllers: [SearchProfilesController],
  providers: [
    CreateSearchProfileUseCase,
    GetSearchProfileUseCase,
    ListSearchProfilesUseCase,
    PauseSearchProfileUseCase,
    ActivateSearchProfileUseCase,
    ArchiveSearchProfileUseCase,
    UpdateSearchProfileUseCase,
    { provide: SEARCH_PROFILE_REPOSITORY, useClass: PrismaSearchProfileAdapter },
  ],
})
export class SearchProfileModule {}
