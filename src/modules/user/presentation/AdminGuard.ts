import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '@app/modules/auth/presentation/interfaces/AuthenticatedRequest';
import { USER_REPOSITORY, UserRepository } from '../application/ports/UserRepository';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.userRepository.findById(request.user.id);

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
