import { SetSearchProfileLimitUseCase } from '@app/modules/user/application/setSearchProfileLimit/SetSearchProfileLimitUseCase';
import { UserNotFoundError } from '@app/modules/user/application/errors/UserNotFoundError';
import { InvalidSearchProfileLimitError } from '@app/modules/user/domain/errors/InvalidSearchProfileLimitError';
import { FakeUserRepository } from '../../../../helpers/fakeUserRepositoryHelper';
import { buildUser } from '../../../../helpers/buildUserHelper';

describe('SetSearchProfileLimitUseCase', () => {
  it('updates and persists the search profile limit', async () => {
    const repository = new FakeUserRepository();
    const user = buildUser();
    repository.saved.push(user);
    const useCase = new SetSearchProfileLimitUseCase(repository);
    const result = await useCase.execute({ userId: user.id, limit: 3 });
    const persisted = await repository.findById(user.id);

    expect(result.isSuccess).toBe(true);
    expect(result.value.searchProfileLimit).toBe(3);
    expect(persisted?.searchProfileLimit).toBe(3);
  });

  it('fails when no user exists for the given id', async () => {
    const repository = new FakeUserRepository();
    const useCase = new SetSearchProfileLimitUseCase(repository);
    const result = await useCase.execute({ userId: 'missing-id', limit: 3 });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(UserNotFoundError);
  });

  it('fails without persisting when the limit is negative', async () => {
    const repository = new FakeUserRepository();
    const user = buildUser();
    repository.saved.push(user);
    const useCase = new SetSearchProfileLimitUseCase(repository);
    const result = await useCase.execute({ userId: user.id, limit: -1 });
    const persisted = await repository.findById(user.id);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(InvalidSearchProfileLimitError);
    expect(persisted?.searchProfileLimit).toBe(1);
  });
});
