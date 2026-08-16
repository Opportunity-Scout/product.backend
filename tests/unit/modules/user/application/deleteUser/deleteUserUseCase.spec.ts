import { DeleteUserUseCase } from '@app/modules/user/application/deleteUser/DeleteUserUseCase';
import { UserAccessService } from '@app/modules/user/application/UserAccessService';
import { UserNotFoundError } from '@app/modules/user/application/errors/UserNotFoundError';
import { FakeUserRepository } from '../../../../helpers/fakeUserRepositoryHelper';
import { FakeSearchProfileRepository } from '../../../../helpers/fakeSearchProfileRepositoryHelper';
import { buildUser } from '../../../../helpers/buildUserHelper';
import { buildSearchProfile } from '../../../../helpers/buildSearchProfileHelper';

describe('DeleteUserUseCase', () => {
  it('deletes the user and all of their search profiles', async () => {
    const userRepository = new FakeUserRepository();
    const searchProfileRepository = new FakeSearchProfileRepository();
    const user = buildUser();
    const otherUser = buildUser({ id: 'other-user' });
    userRepository.saved.push(user, otherUser);

    searchProfileRepository.saved.push(
      buildSearchProfile({ userId: user.id }),
      buildSearchProfile({ userId: otherUser.id }),
    );

    const useCase = new DeleteUserUseCase(
      userRepository,
      searchProfileRepository,
      new UserAccessService(userRepository),
    );

    const result = await useCase.execute({ id: user.id, callerId: user.id });
    const remainingProfiles = await searchProfileRepository.findAllByUserId(user.id);

    expect(result.isSuccess).toBe(true);
    expect(await userRepository.findById(user.id)).toBeNull();
    expect(remainingProfiles).toEqual([]);
    expect(await searchProfileRepository.findAllByUserId(otherUser.id)).toHaveLength(1);
  });

  it('fails when no user exists for the given id', async () => {
    const userRepository = new FakeUserRepository();
    const searchProfileRepository = new FakeSearchProfileRepository();

    const useCase = new DeleteUserUseCase(
      userRepository,
      searchProfileRepository,
      new UserAccessService(userRepository),
    );

    const result = await useCase.execute({ id: 'missing-id', callerId: 'missing-id' });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(UserNotFoundError);
  });

  it('fails without deleting anything when the caller does not own the account', async () => {
    const userRepository = new FakeUserRepository();
    const searchProfileRepository = new FakeSearchProfileRepository();
    const user = buildUser();
    userRepository.saved.push(user);

    const useCase = new DeleteUserUseCase(
      userRepository,
      searchProfileRepository,
      new UserAccessService(userRepository),
    );

    const result = await useCase.execute({ id: user.id, callerId: 'someone-else' });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(UserNotFoundError);
    expect(await userRepository.findById(user.id)).not.toBeNull();
  });

  it('fails when a non-admin caller who is not the owner tries to delete the account', async () => {
    const userRepository = new FakeUserRepository();
    const searchProfileRepository = new FakeSearchProfileRepository();
    const user = buildUser();
    const otherUser = buildUser({ id: 'other-user', role: 'user' });
    userRepository.saved.push(user, otherUser);

    const useCase = new DeleteUserUseCase(
      userRepository,
      searchProfileRepository,
      new UserAccessService(userRepository),
    );

    const result = await useCase.execute({ id: user.id, callerId: otherUser.id });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(UserNotFoundError);
    expect(await userRepository.findById(user.id)).not.toBeNull();
  });

  it('lets an admin caller delete another account and its search profiles', async () => {
    const userRepository = new FakeUserRepository();
    const searchProfileRepository = new FakeSearchProfileRepository();
    const user = buildUser();
    const admin = buildUser({ id: 'admin-user', role: 'admin' });
    userRepository.saved.push(user, admin);
    searchProfileRepository.saved.push(buildSearchProfile({ userId: user.id }));

    const useCase = new DeleteUserUseCase(
      userRepository,
      searchProfileRepository,
      new UserAccessService(userRepository),
    );

    const result = await useCase.execute({ id: user.id, callerId: admin.id });

    expect(result.isSuccess).toBe(true);
    expect(await userRepository.findById(user.id)).toBeNull();
    expect(await searchProfileRepository.findAllByUserId(user.id)).toEqual([]);
  });
});
