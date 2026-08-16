import { UpdateSearchProfileUseCase } from '@app/modules/searchProfile/application/updateSearchProfile/UpdateSearchProfileUseCase';
import { SearchProfileNotFoundError } from '@app/modules/searchProfile/application/errors/SearchProfileNotFoundError';
import { UserAccessService } from '@app/modules/user/application/UserAccessService';
import { FakeSearchProfileRepository } from '../../../../helpers/fakeSearchProfileRepositoryHelper';
import { FakeUserRepository } from '../../../../helpers/fakeUserRepositoryHelper';
import { buildSearchProfile } from '../../../../helpers/buildSearchProfileHelper';
import { buildUser } from '../../../../helpers/buildUserHelper';

describe('UpdateSearchProfileUseCase', () => {
  it('updates the name and persists it', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const profile = buildSearchProfile({ userId: 'user-1', name: 'Backend Prague' });
    await repository.save(profile);
    const useCase = new UpdateSearchProfileUseCase(repository, new UserAccessService(userRepository));
    const result = await useCase.execute({ id: profile.id, callerId: 'user-1', name: 'Senior Backend Prague' });
    const persisted = await repository.findById(profile.id);

    expect(result.isSuccess).toBe(true);
    expect(result.value.name).toBe('Senior Backend Prague');
    expect(persisted?.name).toBe('Senior Backend Prague');
  });

  it('leaves the name unchanged when omitted', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const profile = buildSearchProfile({ userId: 'user-1', name: 'Backend Prague' });
    await repository.save(profile);
    const useCase = new UpdateSearchProfileUseCase(repository, new UserAccessService(userRepository));

    const result = await useCase.execute({
      id: profile.id,
      callerId: 'user-1',
      description: 'Updated description',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.name).toBe('Backend Prague');
  });

  it('clears the description when explicitly set to null', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const profile = buildSearchProfile({ userId: 'user-1', description: 'Remote-friendly backend roles' });
    await repository.save(profile);
    const useCase = new UpdateSearchProfileUseCase(repository, new UserAccessService(userRepository));
    const result = await useCase.execute({ id: profile.id, callerId: 'user-1', description: null });

    expect(result.isSuccess).toBe(true);
    expect(result.value.description).toBeNull();
  });

  it('fully replaces preferences when provided', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const useCase = new UpdateSearchProfileUseCase(repository, new UserAccessService(userRepository));

    const result = await useCase.execute({
      id: profile.id,
      callerId: 'user-1',
      preferences: { location: { remote: false, countries: ['CZ'] } },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.preferences.location.remote).toBe(false);
    expect(result.value.preferences.location.countries).toEqual(['CZ']);
  });

  it('fails without persisting when preferences are invalid', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const useCase = new UpdateSearchProfileUseCase(repository, new UserAccessService(userRepository));

    const result = await useCase.execute({
      id: profile.id,
      callerId: 'user-1',
      preferences: { location: { remote: false } },
    });

    const persisted = await repository.findById(profile.id);

    expect(result.isFailure).toBe(true);
    expect(persisted?.preferences.location.remote).toBe(true);
  });

  it('fails without persisting when the new name is blank', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const profile = buildSearchProfile({ userId: 'user-1', name: 'Backend Prague' });
    await repository.save(profile);
    const useCase = new UpdateSearchProfileUseCase(repository, new UserAccessService(userRepository));
    const result = await useCase.execute({ id: profile.id, callerId: 'user-1', name: '   ' });
    const persisted = await repository.findById(profile.id);

    expect(result.isFailure).toBe(true);
    expect(persisted?.name).toBe('Backend Prague');
  });

  it('fails when no search profile exists for the id', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const useCase = new UpdateSearchProfileUseCase(repository, new UserAccessService(userRepository));
    const result = await useCase.execute({ id: 'missing-id', callerId: 'user-1', name: 'Senior Backend Prague' });

    expect(result.isFailure).toBe(true);
  });

  it('fails with the same not-found error when the profile belongs to a different, non-admin user', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const useCase = new UpdateSearchProfileUseCase(repository, new UserAccessService(userRepository));
    const result = await useCase.execute({ id: profile.id, callerId: 'user-2', name: 'Senior Backend Prague' });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(SearchProfileNotFoundError);
  });

  it('lets an admin caller update a profile that belongs to someone else', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const admin = buildUser({ id: 'admin-user', role: 'admin' });
    userRepository.saved.push(admin);
    const profile = buildSearchProfile({ userId: 'user-1', name: 'Backend Prague' });
    await repository.save(profile);
    const useCase = new UpdateSearchProfileUseCase(repository, new UserAccessService(userRepository));
    const result = await useCase.execute({ id: profile.id, callerId: admin.id, name: 'Senior Backend Prague' });

    expect(result.isSuccess).toBe(true);
    expect(result.value.name).toBe('Senior Backend Prague');
  });
});
