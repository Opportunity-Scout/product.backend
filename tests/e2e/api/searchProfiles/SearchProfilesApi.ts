import { APIRequestContext, APIResponse } from '@playwright/test';
import { routes } from '@/constants';
import { CreateSearchProfilePayload, UpdateSearchProfilePayload } from './interfaces';

export class SearchProfilesApi {
  constructor(private readonly request: APIRequestContext) {}

  async create(accessToken: string, payload: CreateSearchProfilePayload): Promise<APIResponse> {
    return this.request.post(routes.searchProfiles.create, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: payload,
    });
  }

  async getById(accessToken: string, id: string): Promise<APIResponse> {
    return this.request.get(routes.searchProfiles.byId(id), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async update(accessToken: string, id: string, payload: UpdateSearchProfilePayload): Promise<APIResponse> {
    return this.request.patch(routes.searchProfiles.byId(id), {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: payload,
    });
  }
}
