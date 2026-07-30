import { Module } from '@nestjs/common';
import { SearchProfilesController } from './presentation/SearchProfilesController';
import { CreateSearchProfileUseCase } from './application/createSearchProfile/CreateSearchProfileUseCase';
import { SEARCH_PROFILE_REPOSITORY } from './application/ports/SearchProfileRepository';
import { InMemorySearchProfileRepository } from './infrastructure/persistence/InMemorySearchProfileRepository';

@Module({
  controllers: [SearchProfilesController],
  providers: [
    CreateSearchProfileUseCase,
    { provide: SEARCH_PROFILE_REPOSITORY, useClass: InMemorySearchProfileRepository },
  ],
})
export class SearchProfileModule {}
