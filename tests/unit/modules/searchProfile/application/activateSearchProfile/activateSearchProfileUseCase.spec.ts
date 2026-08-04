import { ActivateSearchProfileUseCase } from '@app/modules/searchProfile/application/activateSearchProfile/ActivateSearchProfileUseCase';
import { PauseSearchProfileUseCase } from '@app/modules/searchProfile/application/pauseSearchProfile/PauseSearchProfileUseCase';
import { FakeSearchProfileRepository } from '../../../../helpers/fakeSearchProfileRepositoryHelper';
import { buildSearchProfile } from '../../../../helpers/buildSearchProfileHelper';

describe('ActivateSearchProfileUseCase', () => {
  it('activates a paused search profile and persists it', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile();
    await repository.save(profile);
    await new PauseSearchProfileUseCase(repository).execute({ id: profile.id });
    const useCase = new ActivateSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: profile.id });
    const persisted = await repository.findById(profile.id);

    expect(result.isSuccess).toBe(true);
    expect(result.value.status).toBe('active');
    expect(persisted?.status).toBe('active');
  });

  it('fails when no search profile exists for the id', async () => {
    const repository = new FakeSearchProfileRepository();
    const useCase = new ActivateSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: 'missing-id' });

    expect(result.isFailure).toBe(true);
  });

  it('fails when the search profile is already active', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile();
    await repository.save(profile);
    const useCase = new ActivateSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: profile.id });

    expect(result.isFailure).toBe(true);
  });
});
