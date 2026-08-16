import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '@app/common/persistence/PrismaModule';
import { AuthModule } from '@app/modules/auth/AuthModule';
import { UserModule } from '@app/modules/user/UserModule';
import { SearchProfilesController } from './presentation/SearchProfilesController';
import { CreateSearchProfileUseCase } from './application/createSearchProfile/CreateSearchProfileUseCase';
import { GetSearchProfileUseCase } from './application/getSearchProfile/GetSearchProfileUseCase';
import { ListSearchProfilesUseCase } from './application/listSearchProfiles/ListSearchProfilesUseCase';
import { ListSearchProfilesAdminUseCase } from './application/listSearchProfilesAdmin/ListSearchProfilesAdminUseCase';
import { PauseSearchProfileUseCase } from './application/pauseSearchProfile/PauseSearchProfileUseCase';
import { ActivateSearchProfileUseCase } from './application/activateSearchProfile/ActivateSearchProfileUseCase';
import { ArchiveSearchProfileUseCase } from './application/archiveSearchProfile/ArchiveSearchProfileUseCase';
import { UpdateSearchProfileUseCase } from './application/updateSearchProfile/UpdateSearchProfileUseCase';
import { DeleteSearchProfileUseCase } from './application/deleteSearchProfile/DeleteSearchProfileUseCase';
import { SEARCH_PROFILE_REPOSITORY } from './application/ports/SearchProfileRepository';
import { PrismaSearchProfileAdapter } from './infrastructure/persistence/PrismaSearchProfileAdapter';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => UserModule)],
  controllers: [SearchProfilesController],
  providers: [
    CreateSearchProfileUseCase,
    GetSearchProfileUseCase,
    ListSearchProfilesUseCase,
    ListSearchProfilesAdminUseCase,
    PauseSearchProfileUseCase,
    ActivateSearchProfileUseCase,
    ArchiveSearchProfileUseCase,
    UpdateSearchProfileUseCase,
    DeleteSearchProfileUseCase,
    { provide: SEARCH_PROFILE_REPOSITORY, useClass: PrismaSearchProfileAdapter },
  ],
  exports: [SEARCH_PROFILE_REPOSITORY],
})
export class SearchProfileModule {}
