import { ListUsersUseCase } from '@app/modules/user/application/listUsers/ListUsersUseCase';
import { FakeUserRepository } from '../../../../helpers/fakeUserRepositoryHelper';
import { buildUser } from '../../../../helpers/buildUserHelper';

describe('ListUsersUseCase', () => {
  it('returns a page of users and the total matching count', async () => {
    const userRepository = new FakeUserRepository();
    userRepository.saved.push(buildUser({ id: 'user-1' }), buildUser({ id: 'user-2' }), buildUser({ id: 'user-3' }));
    const useCase = new ListUsersUseCase(userRepository);
    const result = await useCase.execute({ limit: 2, offset: 0 });

    expect(result.users).toHaveLength(2);
    expect(result.total).toBe(3);
  });

  it('filters by the telegramUsername search term', async () => {
    const userRepository = new FakeUserRepository();
    const match = buildUser({ id: 'user-1', telegramUsername: 'oleh_dev' });
    userRepository.saved.push(match, buildUser({ id: 'user-2', telegramUsername: 'someone_else' }));
    const useCase = new ListUsersUseCase(userRepository);
    const result = await useCase.execute({ search: 'oleh', limit: 20, offset: 0 });

    expect(result.users).toEqual([match]);
    expect(result.total).toBe(1);
  });
});
