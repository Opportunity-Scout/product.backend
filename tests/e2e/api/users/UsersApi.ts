import { APIRequestContext, APIResponse } from '@playwright/test';
import { routes } from '@/constants';
import { ListUsersParams } from './interfaces';

export class UsersApi {
  constructor(private readonly request: APIRequestContext) {}

  async getUsers(accessToken: string, params: ListUsersParams = {}): Promise<APIResponse> {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }

    return this.request.get(routes.users.getUsers, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: searchParams,
    });
  }

  async deleteUser(accessToken: string, userId: string): Promise<APIResponse> {
    return this.request.delete(routes.users.deleteById(userId), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async setSearchProfileLimit(accessToken: string, userId: string, limit: number): Promise<APIResponse> {
    return this.request.patch(routes.users.setSearchProfileLimit(userId), {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { limit },
    });
  }
}
