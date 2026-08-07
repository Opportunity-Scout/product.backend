import { User } from '@app/modules/user/domain/User';

export function buildUser(overrides: { telegramUserId?: string; telegramUsername?: string } = {}): User {
  return User.create({
    telegramUserId: overrides.telegramUserId ?? '12345',
    telegramUsername: overrides.telegramUsername,
  });
}
