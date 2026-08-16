import { User } from '../../domain/User';
import { FindManyUsersParams } from './interfaces/FindManyUsersParams';
import { FindManyUsersResult } from './interfaces/FindManyUsersResult';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByTelegramUserId(telegramUserId: string): Promise<User | null>;
  deleteById(id: string): Promise<void>;
  findMany(params: FindManyUsersParams): Promise<FindManyUsersResult>;
}
