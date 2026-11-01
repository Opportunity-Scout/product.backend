import { APIRequestContext } from '@playwright/test';
import { AuthApi } from './auth/AuthApi';
import { UsersApi } from './users/UsersApi';
import { SearchProfilesApi } from './searchProfiles/SearchProfilesApi';

export class BackendApi {
  readonly auth: AuthApi;
  readonly users: UsersApi;
  readonly searchProfiles: SearchProfilesApi;

  constructor(request: APIRequestContext, botToken: string) {
    this.auth = new AuthApi(request, botToken);
    this.users = new UsersApi(request);
    this.searchProfiles = new SearchProfilesApi(request);
  }
}
