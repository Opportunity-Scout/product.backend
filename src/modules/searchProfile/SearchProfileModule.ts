import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/common/persistence/PrismaModule';
import { SearchProfilesController } from './presentation/SearchProfilesController';
import { CreateSearchProfileUseCase } from './application/createSearchProfile/CreateSearchProfileUseCase';
import { SEARCH_PROFILE_REPOSITORY } from './application/ports/SearchProfileRepository';
import { PrismaSearchProfileAdapter } from './infrastructure/persistence/PrismaSearchProfileAdapter';

@Module({
  imports: [PrismaModule],
  controllers: [SearchProfilesController],
  providers: [CreateSearchProfileUseCase, { provide: SEARCH_PROFILE_REPOSITORY, useClass: PrismaSearchProfileAdapter }],
})
export class SearchProfileModule {}
