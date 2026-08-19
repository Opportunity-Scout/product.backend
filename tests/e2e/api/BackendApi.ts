import { APIRequestContext } from '@playwright/test';
import { AuthApi } from './auth/AuthApi';
import { UsersApi } from './users/UsersApi';

export class BackendApi {
  readonly auth: AuthApi;
  readonly users: UsersApi;

  constructor(request: APIRequestContext, botToken: string) {
    this.auth = new AuthApi(request, botToken);
    this.users = new UsersApi(request);
  }
}
