import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaTransactionContext } from '@app/common/persistence/PrismaTransactionContext';
import { User } from '../../domain/User';
import { UserRepository } from '../../application/ports/UserRepository';
import { FindManyUsersParams } from '../../application/ports/interfaces/FindManyUsersParams';
import { FindManyUsersResult } from '../../application/ports/interfaces/FindManyUsersResult';
import { prismaUserMapper } from './helpers/prismaUserMapperHelper';

@Injectable()
export class PrismaUserAdapter implements UserRepository {
  constructor(private readonly db: PrismaTransactionContext) {}

  async save(user: User): Promise<void> {
    await this.db.client.user.upsert({
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
    const row = await this.db.client.user.findUnique({ where: { id } });

    return row ? prismaUserMapper.toDomain(row) : null;
  }

  async findByIdForUpdate(id: string): Promise<User | null> {
    if (!this.db.isInTransaction()) {
      throw new Error(
        'findByIdForUpdate() must run inside UnitOfWork.run(): outside a transaction the lock is released immediately',
      );
    }

    await this.db.client.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;

    return this.findById(id);
  }

  async findByTelegramUserId(telegramUserId: string): Promise<User | null> {
    const row = await this.db.client.user.findUnique({ where: { telegramUserId } });

    return row ? prismaUserMapper.toDomain(row) : null;
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.db.client.user.delete({ where: { id } });
    } catch (error) {
      // P2025 = no row matched: the row is already gone, which is what the caller wanted, so it's a no-op.
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
      this.db.client.user.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.client.user.count({ where }),
    ]);

    return { users: rows.map((row) => prismaUserMapper.toDomain(row)), total };
  }
}
