import { ArchiveSearchProfileUseCase } from '@app/modules/searchProfile/application/archiveSearchProfile/ArchiveSearchProfileUseCase';
import { SearchProfileNotFoundError } from '@app/modules/searchProfile/application/errors/SearchProfileNotFoundError';
import { FakeSearchProfileRepository } from '../../../../helpers/fakeSearchProfileRepositoryHelper';
import { buildSearchProfile } from '../../../../helpers/buildSearchProfileHelper';

describe('ArchiveSearchProfileUseCase', () => {
  it('archives an active search profile and persists it', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const useCase = new ArchiveSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: profile.id, userId: 'user-1' });
    const persisted = await repository.findById(profile.id);

    expect(result.isSuccess).toBe(true);
    expect(result.value.status).toBe('archived');
    expect(persisted?.status).toBe('archived');
  });

  it('fails when no search profile exists for the id', async () => {
    const repository = new FakeSearchProfileRepository();
    const useCase = new ArchiveSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: 'missing-id', userId: 'user-1' });

    expect(result.isFailure).toBe(true);
  });

  it('fails when the search profile is already archived', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const useCase = new ArchiveSearchProfileUseCase(repository);
    await useCase.execute({ id: profile.id, userId: 'user-1' });
    const result = await useCase.execute({ id: profile.id, userId: 'user-1' });

    expect(result.isFailure).toBe(true);
  });

  it('fails with the same not-found error when the profile belongs to a different user', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const useCase = new ArchiveSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: profile.id, userId: 'user-2' });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(SearchProfileNotFoundError);
  });
});
