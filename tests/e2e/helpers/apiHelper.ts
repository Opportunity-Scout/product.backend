import { AuthApi } from '../api/auth/AuthApi';
import { httpStatus } from '../constants/httpStatus';

const ADMIN_USERNAME = 'e2e_admin';

// Module-level, not an instance field — a fresh ApiHelper is constructed per
// test, but this module is loaded once per Playwright worker process, so the
// cached token survives across every test that worker runs. Caps admin
// logins at one per worker instead of one per test, keeping well clear of
// the perAccount rate limit (5 req/min per telegramUserId, see root
// CLAUDE.md) as more admin-scoped tests get added.
let cachedAdminToken: string | undefined;

export class ApiHelper {
  constructor(
    private readonly auth: AuthApi,
    private readonly adminTelegramUserId: string,
  ) {}

  async getAdminAccessToken(): Promise<string> {
    if (cachedAdminToken) {
      return cachedAdminToken;
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

    cachedAdminToken = token;

    return token;
  }
}
