import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FakeUserRepository } from '../../../helpers/fakeUserRepositoryHelper';
import { buildUser } from '../../../helpers/buildUserHelper';
import { buildUsersController } from '../../../helpers/buildUsersControllerHelper';

describe('UsersController', () => {
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
