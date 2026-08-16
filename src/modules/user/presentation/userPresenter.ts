import { User } from '../domain/User';

export function toUserResponse(user: User) {
  return {
    id: user.id,
    telegramUserId: user.telegramUserId,
    telegramUsername: user.telegramUsername,
    role: user.role,
    searchProfileLimit: user.searchProfileLimit,
    createdAt: user.createdAt,
  };
}
