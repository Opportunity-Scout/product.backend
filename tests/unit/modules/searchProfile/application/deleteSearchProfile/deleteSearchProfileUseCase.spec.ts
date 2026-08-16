import { DeleteSearchProfileUseCase } from '@app/modules/searchProfile/application/deleteSearchProfile/DeleteSearchProfileUseCase';
import { SearchProfileNotFoundError } from '@app/modules/searchProfile/application/errors/SearchProfileNotFoundError';
import { UserAccessService } from '@app/modules/user/application/UserAccessService';
import { FakeSearchProfileRepository } from '../../../../helpers/fakeSearchProfileRepositoryHelper';
import { FakeUserRepository } from '../../../../helpers/fakeUserRepositoryHelper';
import { buildSearchProfile } from '../../../../helpers/buildSearchProfileHelper';
import { buildUser } from '../../../../helpers/buildUserHelper';

describe('DeleteSearchProfileUseCase', () => {
  it('deletes the search profile when the caller owns it', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const useCase = new DeleteSearchProfileUseCase(repository, new UserAccessService(userRepository));
    const result = await useCase.execute({ id: profile.id, callerId: 'user-1' });

    expect(result.isSuccess).toBe(true);
    expect(await repository.findById(profile.id)).toBeNull();
  });

  it('fails when no search profile exists for the id', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const useCase = new DeleteSearchProfileUseCase(repository, new UserAccessService(userRepository));
    const result = await useCase.execute({ id: 'missing-id', callerId: 'user-1' });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(SearchProfileNotFoundError);
  });

  it('fails without deleting anything when a non-admin caller does not own the profile', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const useCase = new DeleteSearchProfileUseCase(repository, new UserAccessService(userRepository));
    const result = await useCase.execute({ id: profile.id, callerId: 'user-2' });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(SearchProfileNotFoundError);
    expect(await repository.findById(profile.id)).not.toBeNull();
  });

  it('lets an admin caller delete a profile that belongs to someone else', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const admin = buildUser({ id: 'admin-user', role: 'admin' });
    userRepository.saved.push(admin);
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const useCase = new DeleteSearchProfileUseCase(repository, new UserAccessService(userRepository));
    const result = await useCase.execute({ id: profile.id, callerId: admin.id });

    expect(result.isSuccess).toBe(true);
    expect(await repository.findById(profile.id)).toBeNull();
  });
});
