import { APIRequestContext, APIResponse } from '@playwright/test';
import { commonHelper } from '../../helpers/commonHelper';
import { TelegramLoginFields } from './interfaces';
import { routes } from '../../constants';

export class AuthApi {
  constructor(
    private readonly request: APIRequestContext,
    private readonly botToken: string,
  ) {}

  async login(fields: TelegramLoginFields): Promise<APIResponse> {
    const payload = commonHelper.signTelegramLoginPayload(fields, this.botToken);

    return this.request.post(routes.auth.login, { data: payload });
  }
}
