import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/common/persistence/PrismaService';
import { User } from '../../domain/User';
import { UserRepository } from '../../application/ports/UserRepository';
import { prismaUserMapper } from './helpers/prismaUserMapperHelper';

@Injectable()
export class PrismaUserAdapter implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        telegramUserId: user.telegramUserId,
        telegramUsername: user.telegramUsername,
        createdAt: user.createdAt,
      },
      update: {
        telegramUserId: user.telegramUserId,
        telegramUsername: user.telegramUsername,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });

    return row ? prismaUserMapper.toDomain(row) : null;
  }

  async findByTelegramUserId(telegramUserId: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { telegramUserId } });

    return row ? prismaUserMapper.toDomain(row) : null;
  }
}
