import { User } from '../../../domain/User';

export interface ListUsersOutput {
  users: User[];
  total: number;
}
