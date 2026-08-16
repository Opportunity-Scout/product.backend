import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FakeUserRepository } from '../../../helpers/fakeUserRepositoryHelper';
import { FakeSearchProfileRepository } from '../../../helpers/fakeSearchProfileRepositoryHelper';
import { buildUser } from '../../../helpers/buildUserHelper';
import { buildSearchProfile } from '../../../helpers/buildSearchProfileHelper';
import { buildUsersController } from '../../../helpers/buildUsersControllerHelper';

describe('UsersController', () => {
  describe('GET', () => {
    it('returns a paginated page of users', async () => {
      const userRepository = new FakeUserRepository();
      userRepository.saved.push(buildUser({ id: 'user-1' }), buildUser({ id: 'user-2' }));
      const controller = buildUsersController(userRepository);
      const response = await controller.list({ limit: 1, offset: 0 });

      expect(response.total).toBe(2);
      expect(response.users).toHaveLength(1);
      expect(response.limit).toBe(1);
      expect(response.offset).toBe(0);
    });
  });

  describe('PATCH :id/search-profile-limit', () => {
    it('returns the updated search profile limit on success', async () => {
      const repository = new FakeUserRepository();
      const user = buildUser();
      repository.saved.push(user);
      const controller = buildUsersController(repository);
      const response = await controller.setSearchProfileLimit(user.id, { limit: 5 });

      expect(response).toEqual({ id: user.id, searchProfileLimit: 5 });
    });

    it('responds with 404 when no user exists for the id', async () => {
      const controller = buildUsersController();

      await expect(
        controller.setSearchProfileLimit('00000000-0000-0000-0000-000000000000', { limit: 5 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('responds with 400 when the limit is negative', async () => {
      const repository = new FakeUserRepository();
      const user = buildUser();
      repository.saved.push(user);
      const controller = buildUsersController(repository);

      await expect(controller.setSearchProfileLimit(user.id, { limit: -1 })).rejects.toThrow(BadRequestException);
    });
  });

  describe('DELETE :id', () => {
    it('deletes the account and its search profiles when the caller owns it', async () => {
      const userRepository = new FakeUserRepository();
      const searchProfileRepository = new FakeSearchProfileRepository();
      const user = buildUser();
      userRepository.saved.push(user);
      searchProfileRepository.saved.push(buildSearchProfile({ userId: user.id }));
      const controller = buildUsersController(userRepository, searchProfileRepository);
      await controller.deleteUser(user.id, user.id);

      expect(await userRepository.findById(user.id)).toBeNull();
      expect(await searchProfileRepository.findAllByUserId(user.id)).toEqual([]);
    });

    it('responds with 404 when the caller does not own the account', async () => {
      const userRepository = new FakeUserRepository();
      const user = buildUser();
      userRepository.saved.push(user);
      const controller = buildUsersController(userRepository);

      await expect(controller.deleteUser(user.id, 'someone-else')).rejects.toThrow(NotFoundException);
    });

    it('lets an admin caller delete another account', async () => {
      const userRepository = new FakeUserRepository();
      const searchProfileRepository = new FakeSearchProfileRepository();
      const user = buildUser();
      const admin = buildUser({ id: 'admin-user', role: 'admin' });
      userRepository.saved.push(user, admin);
      const controller = buildUsersController(userRepository, searchProfileRepository);
      await controller.deleteUser(user.id, admin.id);

      expect(await userRepository.findById(user.id)).toBeNull();
    });
  });
});
