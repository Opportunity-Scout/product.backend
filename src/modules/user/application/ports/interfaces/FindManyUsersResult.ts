import { User } from '../../../domain/User';

export interface FindManyUsersResult {
  users: User[];
  total: number;
}
