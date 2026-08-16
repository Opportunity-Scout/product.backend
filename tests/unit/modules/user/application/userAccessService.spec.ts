import { UserAccessService } from '@app/modules/user/application/UserAccessService';
import { FakeUserRepository } from '../../../helpers/fakeUserRepositoryHelper';
import { buildUser } from '../../../helpers/buildUserHelper';

describe('UserAccessService', () => {
  describe('isAdmin', () => {
    it('returns true for an admin user', async () => {
      const userRepository = new FakeUserRepository();
      const admin = buildUser({ id: 'admin-user', role: 'admin' });
      userRepository.saved.push(admin);
      const service = new UserAccessService(userRepository);

      expect(await service.isAdmin(admin.id)).toBe(true);
    });

    it('returns false for a non-admin user', async () => {
      const userRepository = new FakeUserRepository();
      const user = buildUser({ role: 'user' });
      userRepository.saved.push(user);
      const service = new UserAccessService(userRepository);

      expect(await service.isAdmin(user.id)).toBe(false);
    });

    it('returns false when no user exists for the id', async () => {
      const userRepository = new FakeUserRepository();
      const service = new UserAccessService(userRepository);

      expect(await service.isAdmin('missing-id')).toBe(false);
    });
  });

  describe('isOwnerOrAdmin', () => {
    it('returns true when the caller is the resource owner', async () => {
      const userRepository = new FakeUserRepository();
      const service = new UserAccessService(userRepository);

      expect(await service.isOwnerOrAdmin('user-1', 'user-1')).toBe(true);
    });

    it('returns true when the caller is not the owner but is an admin', async () => {
      const userRepository = new FakeUserRepository();
      const admin = buildUser({ id: 'admin-user', role: 'admin' });
      userRepository.saved.push(admin);
      const service = new UserAccessService(userRepository);

      expect(await service.isOwnerOrAdmin('user-1', admin.id)).toBe(true);
    });

    it('returns false when the caller is neither the owner nor an admin', async () => {
      const userRepository = new FakeUserRepository();
      const user = buildUser({ id: 'user-2', role: 'user' });
      userRepository.saved.push(user);
      const service = new UserAccessService(userRepository);

      expect(await service.isOwnerOrAdmin('user-1', user.id)).toBe(false);
    });
  });
});
