import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@app/AppModule';
import { PrismaService } from '@app/common/persistence/PrismaService';
import {
  SEARCH_PROFILE_REPOSITORY,
  SearchProfileRepository,
} from '@app/modules/searchProfile/application/ports/SearchProfileRepository';
import { SearchPreferences } from '@app/modules/searchProfile/domain/SearchPreferences';
import { SearchProfile } from '@app/modules/searchProfile/domain/SearchProfile';

describe('PrismaSearchProfileAdapter (integration)', () => {
  let moduleRef: TestingModule;
  let repository: SearchProfileRepository;
  let prismaService: PrismaService;
  let createdSearchProfileId: string | undefined;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await moduleRef.init();
    repository = moduleRef.get<SearchProfileRepository>(SEARCH_PROFILE_REPOSITORY);
    prismaService = moduleRef.get(PrismaService, { strict: false });
  });

  afterAll(async () => {
    if (createdSearchProfileId) {
      await prismaService.searchProfile.delete({ where: { id: createdSearchProfileId } });
    }

    await moduleRef.close();
  });

  it('reconstructs an equivalent search profile after a real save/findById round trip', async () => {
    const preferencesResult = SearchPreferences.create({
      location: { remote: false, countries: ['CZ'], relocation: true },
    });

    if (preferencesResult.isFailure) {
      throw preferencesResult.error;
    }

    const profileResult = SearchProfile.create({
      userId: 'integration-user-2',
      name: 'Backend Prague',
      description: 'Remote-friendly backend roles',
      preferences: preferencesResult.value,
    });

    if (profileResult.isFailure) {
      throw profileResult.error;
    }

    const profile = profileResult.value;
    createdSearchProfileId = profile.id;

    await repository.save(profile);
    const found = await repository.findById(profile.id);

    expect(found).not.toBeNull();
    expect(found).not.toBe(profile);
    expect(found?.id).toBe(profile.id);
    expect(found?.userId).toBe(profile.userId);
    expect(found?.name).toBe(profile.name);
    expect(found?.description).toBe(profile.description);
    expect(found?.status).toBe(profile.status);
    expect(found?.preferences.location.remote).toBe(false);
    expect(found?.preferences.location.countries).toEqual(['CZ']);
    expect(found?.preferences.location.relocation).toBe(true);
  });

  it('returns null when no row exists for the given id', async () => {
    const found = await repository.findById('00000000-0000-0000-0000-000000000000');

    expect(found).toBeNull();
  });
});
