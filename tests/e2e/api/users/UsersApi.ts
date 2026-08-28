import { APIRequestContext, APIResponse } from '@playwright/test';
import { routes } from '../../constants';
import { ListUsersParams } from './interfaces';

export class UsersApi {
  constructor(private readonly request: APIRequestContext) {}

  async list(accessToken: string, params: ListUsersParams = {}): Promise<APIResponse> {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }

    return this.request.get(routes.users.list, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: searchParams,
    });
  }

  async delete(accessToken: string, userId: string): Promise<APIResponse> {
    return this.request.delete(routes.users.deleteById(userId), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}
