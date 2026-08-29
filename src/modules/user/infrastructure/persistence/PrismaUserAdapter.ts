import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/common/persistence/PrismaService';
import { User } from '../../domain/User';
import { UserRepository } from '../../application/ports/UserRepository';
import { FindManyUsersParams } from '../../application/ports/interfaces/FindManyUsersParams';
import { FindManyUsersResult } from '../../application/ports/interfaces/FindManyUsersResult';
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
        role: user.role,
        searchProfileLimit: user.searchProfileLimit,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      update: {
        telegramUserId: user.telegramUserId,
        telegramUsername: user.telegramUsername,
        role: user.role,
        searchProfileLimit: user.searchProfileLimit,
        updatedAt: user.updatedAt,
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

  async deleteById(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      // P2025 = no row matched — a concurrent delete already removed it between
      // the use case's findById() and this call. The caller's intent (the row
      // is gone) is already satisfied, so treat it as a successful no-op rather
      // than letting an unhandled Prisma error surface as a 500.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2025') {
        throw error;
      }
    }
  }

  async findMany(params: FindManyUsersParams): Promise<FindManyUsersResult> {
    const where: Prisma.UserWhereInput = params.telegramUsername
      ? { telegramUsername: { contains: params.telegramUsername, mode: 'insensitive' } }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({ where, take: params.limit, skip: params.offset, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);

    return { users: rows.map((row) => prismaUserMapper.toDomain(row)), total };
  }
}
