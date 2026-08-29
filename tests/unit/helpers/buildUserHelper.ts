import { User } from '@app/modules/user/domain/User';
import { BuildUserOverrides } from '../interfaces';

export function buildUser(overrides: BuildUserOverrides = {}): User {
  const created = User.create({
    telegramUserId: overrides.telegramUserId ?? '12345',
    telegramUsername: overrides.telegramUsername,
  });

  if (overrides.id === undefined && overrides.role === undefined && overrides.searchProfileLimit === undefined) {
    return created;
  }

  return User.reconstitute({
    id: overrides.id ?? created.id,
    telegramUserId: created.telegramUserId,
    telegramUsername: created.telegramUsername,
    role: overrides.role ?? created.role,
    searchProfileLimit: overrides.searchProfileLimit ?? created.searchProfileLimit,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  });
}
