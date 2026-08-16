import { GetSearchProfileUseCase } from '@app/modules/searchProfile/application/getSearchProfile/GetSearchProfileUseCase';
import { SearchProfileNotFoundError } from '@app/modules/searchProfile/application/errors/SearchProfileNotFoundError';
import { UserAccessService } from '@app/modules/user/application/UserAccessService';
import { FakeSearchProfileRepository } from '../../../../helpers/fakeSearchProfileRepositoryHelper';
import { FakeUserRepository } from '../../../../helpers/fakeUserRepositoryHelper';
import { buildSearchProfile } from '../../../../helpers/buildSearchProfileHelper';
import { buildUser } from '../../../../helpers/buildUserHelper';

describe('GetSearchProfileUseCase', () => {
  it('returns the search profile when it exists and belongs to the caller', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const useCase = new GetSearchProfileUseCase(repository, new UserAccessService(userRepository));
    const result = await useCase.execute({ id: profile.id, callerId: 'user-1' });

    expect(result.isSuccess).toBe(true);
    expect(result.value.id).toBe(profile.id);
  });

  it('fails when no search profile exists for the id', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const useCase = new GetSearchProfileUseCase(repository, new UserAccessService(userRepository));
    const result = await useCase.execute({ id: 'missing-id', callerId: 'user-1' });

    expect(result.isFailure).toBe(true);
  });

  it('fails with the same not-found error when the profile belongs to a different, non-admin user', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const useCase = new GetSearchProfileUseCase(repository, new UserAccessService(userRepository));
    const result = await useCase.execute({ id: profile.id, callerId: 'user-2' });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(SearchProfileNotFoundError);
  });

  it('lets an admin caller read a profile that belongs to someone else', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const admin = buildUser({ id: 'admin-user', role: 'admin' });
    userRepository.saved.push(admin);
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const useCase = new GetSearchProfileUseCase(repository, new UserAccessService(userRepository));
    const result = await useCase.execute({ id: profile.id, callerId: admin.id });

    expect(result.isSuccess).toBe(true);
    expect(result.value.id).toBe(profile.id);
  });
});
