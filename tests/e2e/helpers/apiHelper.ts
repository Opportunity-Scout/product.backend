import { AuthApi } from '../api/auth/AuthApi';
import { httpStatus } from '../constants';

const ADMIN_USERNAME = 'e2e_admin';

export class ApiHelper {
  private cachedAdminToken: string | undefined;

  constructor(
    private readonly auth: AuthApi,
    private readonly adminTelegramUserId: string,
  ) {}

  async getAdminAccessToken(): Promise<string> {
    if (this.cachedAdminToken) {
      return this.cachedAdminToken;
    }

    const response = await this.auth.login({
      id: this.adminTelegramUserId,
      auth_date: Math.floor(Date.now() / 1000),
      username: ADMIN_USERNAME,
    });

    if (response.status() !== httpStatus.OK) {
      throw new Error(`Admin login failed: expected HTTP ${httpStatus.OK}, got ${response.status()}`);
    }

    const { token } = (await response.json()) as { token: string };
    this.cachedAdminToken = token;

    return token;
  }
}
