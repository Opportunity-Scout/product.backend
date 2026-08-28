import { User } from './User';

export interface GetUsersListResponse {
  users: User[];
  total: number;
  limit: number;
  offset: number;
}
