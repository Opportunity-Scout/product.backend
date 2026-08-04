import { UpdateSearchProfileUseCase } from '@app/modules/searchProfile/application/updateSearchProfile/UpdateSearchProfileUseCase';
import { FakeSearchProfileRepository } from '../../../../helpers/fakeSearchProfileRepositoryHelper';
import { buildSearchProfile } from '../../../../helpers/buildSearchProfileHelper';

describe('UpdateSearchProfileUseCase', () => {
  it('updates the name and persists it', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ name: 'Backend Prague' });
    await repository.save(profile);
    const useCase = new UpdateSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: profile.id, name: 'Senior Backend Prague' });
    const persisted = await repository.findById(profile.id);

    expect(result.isSuccess).toBe(true);
    expect(result.value.name).toBe('Senior Backend Prague');
    expect(persisted?.name).toBe('Senior Backend Prague');
  });

  it('leaves the name unchanged when omitted', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ name: 'Backend Prague' });
    await repository.save(profile);
    const useCase = new UpdateSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: profile.id, description: 'Updated description' });

    expect(result.isSuccess).toBe(true);
    expect(result.value.name).toBe('Backend Prague');
  });

  it('clears the description when explicitly set to null', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ description: 'Remote-friendly backend roles' });
    await repository.save(profile);
    const useCase = new UpdateSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: profile.id, description: null });

    expect(result.isSuccess).toBe(true);
    expect(result.value.description).toBeNull();
  });

  it('fully replaces preferences when provided', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile();
    await repository.save(profile);
    const useCase = new UpdateSearchProfileUseCase(repository);

    const result = await useCase.execute({
      id: profile.id,
      preferences: { location: { remote: false, countries: ['CZ'] } },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.preferences.location.remote).toBe(false);
    expect(result.value.preferences.location.countries).toEqual(['CZ']);
  });

  it('fails without persisting when preferences are invalid', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile();
    await repository.save(profile);
    const useCase = new UpdateSearchProfileUseCase(repository);

    const result = await useCase.execute({
      id: profile.id,
      preferences: { location: { remote: false } },
    });

    const persisted = await repository.findById(profile.id);

    expect(result.isFailure).toBe(true);
    expect(persisted?.preferences.location.remote).toBe(true);
  });

  it('fails without persisting when the new name is blank', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ name: 'Backend Prague' });
    await repository.save(profile);
    const useCase = new UpdateSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: profile.id, name: '   ' });
    const persisted = await repository.findById(profile.id);

    expect(result.isFailure).toBe(true);
    expect(persisted?.name).toBe('Backend Prague');
  });

  it('fails when no search profile exists for the id', async () => {
    const repository = new FakeSearchProfileRepository();
    const useCase = new UpdateSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: 'missing-id', name: 'Senior Backend Prague' });

    expect(result.isFailure).toBe(true);
  });
});
