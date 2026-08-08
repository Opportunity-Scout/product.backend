import { CreateSearchProfileUseCase } from '@app/modules/searchProfile/application/createSearchProfile/CreateSearchProfileUseCase';
import { SearchProfileLimitExceededError } from '@app/modules/searchProfile/application/errors/SearchProfileLimitExceededError';
import { UserNotFoundError } from '@app/modules/user/application/errors/UserNotFoundError';
import { FakeSearchProfileRepository } from '../../../../helpers/fakeSearchProfileRepositoryHelper';
import { FakeUserRepository } from '../../../../helpers/fakeUserRepositoryHelper';
import { buildUser } from '../../../../helpers/buildUserHelper';
import { buildSearchProfile } from '../../../../helpers/buildSearchProfileHelper';

describe('CreateSearchProfileUseCase', () => {
  it('creates and persists a search profile', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    userRepository.saved.push(buildUser({ id: 'user-1' }));
    const useCase = new CreateSearchProfileUseCase(repository, userRepository);

    const result = await useCase.execute({
      userId: 'user-1',
      name: 'Senior QA Europe',
      preferences: { location: { remote: true, relocation: false } },
    });

    expect(result.isSuccess).toBe(true);
    expect(repository.saved).toHaveLength(1);
    expect(repository.saved[0].name).toBe('Senior QA Europe');
  });

  it('fails without persisting when preferences are invalid', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    userRepository.saved.push(buildUser({ id: 'user-1' }));
    const useCase = new CreateSearchProfileUseCase(repository, userRepository);

    const result = await useCase.execute({
      userId: 'user-1',
      name: 'Invalid',
      preferences: { location: { remote: false, relocation: false } },
    });

    expect(result.isFailure).toBe(true);
    expect(repository.saved).toHaveLength(0);
  });

  it('fails without persisting when the name is blank, even with valid preferences', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    userRepository.saved.push(buildUser({ id: 'user-1' }));
    const useCase = new CreateSearchProfileUseCase(repository, userRepository);

    const result = await useCase.execute({
      userId: 'user-1',
      name: '   ',
      preferences: { location: { remote: true, relocation: false } },
    });

    expect(result.isFailure).toBe(true);
    expect(repository.saved).toHaveLength(0);
  });

  it('fails when the caller has no matching user', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const useCase = new CreateSearchProfileUseCase(repository, userRepository);

    const result = await useCase.execute({
      userId: 'missing-user',
      name: 'Senior QA Europe',
      preferences: { location: { remote: true, relocation: false } },
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(UserNotFoundError);
  });

  it('fails once the user already has an active or paused search profile at the free-tier limit', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    userRepository.saved.push(buildUser({ id: 'user-1', searchProfileLimit: 1 }));
    await repository.save(buildSearchProfile({ userId: 'user-1' }));
    const useCase = new CreateSearchProfileUseCase(repository, userRepository);

    const result = await useCase.execute({
      userId: 'user-1',
      name: 'Second Profile',
      preferences: { location: { remote: true, relocation: false } },
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(SearchProfileLimitExceededError);
    expect(repository.saved).toHaveLength(1);
  });

  it('does not count archived search profiles against the limit', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    userRepository.saved.push(buildUser({ id: 'user-1', searchProfileLimit: 1 }));
    const archivedProfile = buildSearchProfile({ userId: 'user-1' });
    const archivedResult = archivedProfile.archive();

    if (archivedResult.isFailure) {
      throw archivedResult.error;
    }

    await repository.save(archivedResult.value);
    const useCase = new CreateSearchProfileUseCase(repository, userRepository);

    const result = await useCase.execute({
      userId: 'user-1',
      name: 'New Profile',
      preferences: { location: { remote: true, relocation: false } },
    });

    expect(result.isSuccess).toBe(true);
    expect(repository.saved).toHaveLength(2);
  });

  it('allows creating a second profile once the admin raises the limit', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    userRepository.saved.push(buildUser({ id: 'user-1', searchProfileLimit: 2 }));
    await repository.save(buildSearchProfile({ userId: 'user-1' }));
    const useCase = new CreateSearchProfileUseCase(repository, userRepository);

    const result = await useCase.execute({
      userId: 'user-1',
      name: 'Second Profile',
      preferences: { location: { remote: true, relocation: false } },
    });

    expect(result.isSuccess).toBe(true);
    expect(repository.saved).toHaveLength(2);
  });
});
