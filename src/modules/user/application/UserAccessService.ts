import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from './ports/UserRepository';

@Injectable()
export class UserAccessService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);

    return user?.role === 'admin';
  }

  async isOwnerOrAdmin(resourceOwnerId: string, callerId: string): Promise<boolean> {
    if (resourceOwnerId === callerId) {
      return true;
    }

    return this.isAdmin(callerId);
  }
}
