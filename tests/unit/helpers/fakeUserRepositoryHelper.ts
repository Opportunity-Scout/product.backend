import { UserRepository } from '@app/modules/user/application/ports/UserRepository';
import { User } from '@app/modules/user/domain/User';

export class FakeUserRepository implements UserRepository {
  public readonly saved: User[] = [];

  save(user: User): Promise<void> {
    const index = this.saved.findIndex((existing) => existing.id === user.id);

    if (index === -1) {
      this.saved.push(user);
    } else {
      this.saved[index] = user;
    }

    return Promise.resolve();
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.saved.find((user) => user.id === id) ?? null);
  }

  findByTelegramUserId(telegramUserId: string): Promise<User | null> {
    return Promise.resolve(this.saved.find((user) => user.telegramUserId === telegramUserId) ?? null);
  }
}
