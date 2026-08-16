import { UserRepository } from '@app/modules/user/application/ports/UserRepository';
import { FindManyUsersParams } from '@app/modules/user/application/ports/interfaces/FindManyUsersParams';
import { FindManyUsersResult } from '@app/modules/user/application/ports/interfaces/FindManyUsersResult';
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

  deleteById(id: string): Promise<void> {
    const index = this.saved.findIndex((user) => user.id === id);

    if (index !== -1) {
      this.saved.splice(index, 1);
    }

    return Promise.resolve();
  }

  findMany(params: FindManyUsersParams): Promise<FindManyUsersResult> {
    const matching = params.search
      ? this.saved.filter((user) => user.telegramUsername?.toLowerCase().includes(params.search!.toLowerCase()))
      : this.saved;

    return Promise.resolve({
      users: matching.slice(params.offset, params.offset + params.limit),
      total: matching.length,
    });
  }
}
