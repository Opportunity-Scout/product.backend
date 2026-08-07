import { User as UserRow } from '@prisma/client';
import { User } from '../../../domain/User';

class PrismaUserMapper {
  toDomain(row: UserRow): User {
    return User.reconstitute({
      id: row.id,
      telegramUserId: row.telegramUserId,
      telegramUsername: row.telegramUsername,
      createdAt: row.createdAt,
    });
  }
}

export const prismaUserMapper = new PrismaUserMapper();
