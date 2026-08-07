import { User } from '../../domain/User';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByTelegramUserId(telegramUserId: string): Promise<User | null>;
}
