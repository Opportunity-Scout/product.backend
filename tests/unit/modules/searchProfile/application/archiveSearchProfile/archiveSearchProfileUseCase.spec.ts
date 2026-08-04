import { ArchiveSearchProfileUseCase } from '@app/modules/searchProfile/application/archiveSearchProfile/ArchiveSearchProfileUseCase';
import { FakeSearchProfileRepository } from '../../../../helpers/fakeSearchProfileRepositoryHelper';
import { buildSearchProfile } from '../../../../helpers/buildSearchProfileHelper';

describe('ArchiveSearchProfileUseCase', () => {
  it('archives an active search profile and persists it', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile();
    await repository.save(profile);
    const useCase = new ArchiveSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: profile.id });
    const persisted = await repository.findById(profile.id);

    expect(result.isSuccess).toBe(true);
    expect(result.value.status).toBe('archived');
    expect(persisted?.status).toBe('archived');
  });

  it('fails when no search profile exists for the id', async () => {
    const repository = new FakeSearchProfileRepository();
    const useCase = new ArchiveSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: 'missing-id' });

    expect(result.isFailure).toBe(true);
  });

  it('fails when the search profile is already archived', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile();
    await repository.save(profile);
    const useCase = new ArchiveSearchProfileUseCase(repository);
    await useCase.execute({ id: profile.id });
    const result = await useCase.execute({ id: profile.id });

    expect(result.isFailure).toBe(true);
  });
});
