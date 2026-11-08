import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@app/AppModule';
import { PrismaService } from '@app/common/persistence/PrismaService';
import {
  SEARCH_PROFILE_REPOSITORY,
  SearchProfileRepository,
} from '@app/modules/searchProfile/application/ports/SearchProfileRepository';
import { SearchProfileConcurrentModificationError } from '@app/modules/searchProfile/application/errors/SearchProfileConcurrentModificationError';
import { SearchProfileNotFoundError } from '@app/modules/searchProfile/application/errors/SearchProfileNotFoundError';
import { SearchPreferences } from '@app/modules/searchProfile/domain/SearchPreferences';
import { SearchProfile } from '@app/modules/searchProfile/domain/SearchProfile';

describe('PrismaSearchProfileAdapter (integration)', () => {
  let moduleRef: TestingModule;
  let repository: SearchProfileRepository;
  let prismaService: PrismaService;
  const createdSearchProfileIds: string[] = [];

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await moduleRef.init();
    repository = moduleRef.get<SearchProfileRepository>(SEARCH_PROFILE_REPOSITORY);
    prismaService = moduleRef.get(PrismaService, { strict: false });
  });

  afterAll(async () => {
    for (const id of createdSearchProfileIds) {
      await prismaService.searchProfile.delete({ where: { id } });
    }

    await moduleRef.close();
  });

  it('reconstructs an equivalent search profile after a real create/findById round trip', async () => {
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
    createdSearchProfileIds.push(profile.id);

    await repository.create(profile);
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

  it('increments the version on update and rejects a second update made from the same stale read', async () => {
    const preferencesResult = SearchPreferences.create({ location: { remote: true } });

    if (preferencesResult.isFailure) {
      throw preferencesResult.error;
    }

    const profileResult = SearchProfile.create({
      userId: 'integration-user-3',
      name: 'Backend Prague',
      preferences: preferencesResult.value,
    });

    if (profileResult.isFailure) {
      throw profileResult.error;
    }

    const staleRead = profileResult.value;
    createdSearchProfileIds.push(staleRead.id);
    await repository.create(staleRead);
    const returnedByUpdate = await repository.update(staleRead);
    const afterFirstUpdate = await repository.findById(staleRead.id);

    expect(afterFirstUpdate?.version).toBe(1);
    expect(returnedByUpdate.version).toBe(1);
    await expect(repository.update(staleRead)).rejects.toBeInstanceOf(SearchProfileConcurrentModificationError);
  });

  it('reports not found, not a conflict, when the row was deleted after it was read', async () => {
    const preferencesResult = SearchPreferences.create({ location: { remote: true } });

    if (preferencesResult.isFailure) {
      throw preferencesResult.error;
    }

    const profileResult = SearchProfile.create({
      userId: 'integration-user-4',
      name: 'Backend Prague',
      preferences: preferencesResult.value,
    });

    if (profileResult.isFailure) {
      throw profileResult.error;
    }

    const readBeforeDelete = profileResult.value;
    await repository.create(readBeforeDelete);
    await repository.deleteById(readBeforeDelete.id);

    await expect(repository.update(readBeforeDelete)).rejects.toBeInstanceOf(SearchProfileNotFoundError);
  });

  it('returns null when no row exists for the given id', async () => {
    const found = await repository.findById('00000000-0000-0000-0000-000000000000');

    expect(found).toBeNull();
  });
});
