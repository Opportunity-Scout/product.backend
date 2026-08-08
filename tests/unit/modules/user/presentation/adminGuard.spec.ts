import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from '@app/modules/user/presentation/AdminGuard';
import { AuthenticatedRequest } from '@app/modules/auth/presentation/interfaces/AuthenticatedRequest';
import { FakeUserRepository } from '../../../helpers/fakeUserRepositoryHelper';
import { buildUser } from '../../../helpers/buildUserHelper';

function buildContext(userId: string): ExecutionContext {
  const request = { user: { id: userId } } as AuthenticatedRequest;

  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  it('allows the request when the caller is an admin', async () => {
    const repository = new FakeUserRepository();
    const admin = buildUser({ role: 'admin' });
    repository.saved.push(admin);
    const guard = new AdminGuard(repository);
    const canActivate = await guard.canActivate(buildContext(admin.id));

    expect(canActivate).toBe(true);
  });

  it('rejects the request when the caller is a regular user', async () => {
    const repository = new FakeUserRepository();
    const user = buildUser({ role: 'user' });
    repository.saved.push(user);
    const guard = new AdminGuard(repository);

    await expect(guard.canActivate(buildContext(user.id))).rejects.toThrow(ForbiddenException);
  });

  it('rejects the request when no user exists for the caller id', async () => {
    const repository = new FakeUserRepository();
    const guard = new AdminGuard(repository);

    await expect(guard.canActivate(buildContext('missing-id'))).rejects.toThrow(ForbiddenException);
  });
});
