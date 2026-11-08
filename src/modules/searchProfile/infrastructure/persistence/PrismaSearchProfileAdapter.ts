import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaTransactionContext } from '@app/common/persistence/PrismaTransactionContext';
import { SearchProfile } from '../../domain/SearchProfile';
import { SearchProfileRepository } from '../../application/ports/SearchProfileRepository';
import { SearchProfileConcurrentModificationError } from '../../application/errors/SearchProfileConcurrentModificationError';
import { SearchProfileNotFoundError } from '../../application/errors/SearchProfileNotFoundError';
import { FindManySearchProfilesParams } from '../../application/ports/interfaces/FindManySearchProfilesParams';
import { FindManySearchProfilesResult } from '../../application/ports/interfaces/FindManySearchProfilesResult';
import { prismaSearchProfileMapper } from './helpers/prismaSearchProfileMapperHelper';

@Injectable()
export class PrismaSearchProfileAdapter implements SearchProfileRepository {
  constructor(private readonly db: PrismaTransactionContext) {}

  async create(searchProfile: SearchProfile): Promise<void> {
    await this.db.client.searchProfile.create({
      data: {
        id: searchProfile.id,
        userId: searchProfile.userId,
        name: searchProfile.name,
        description: searchProfile.description,
        status: searchProfile.status,
        preferences: prismaSearchProfileMapper.toPersistenceJson(searchProfile.preferences),
        createdAt: searchProfile.createdAt,
        updatedAt: searchProfile.updatedAt,
        lastMatchedAt: searchProfile.lastMatchedAt,
        version: searchProfile.version,
      },
    });
  }

  async update(searchProfile: SearchProfile): Promise<SearchProfile> {
    const { count } = await this.db.client.searchProfile.updateMany({
      where: { id: searchProfile.id, version: searchProfile.version },
      data: {
        name: searchProfile.name,
        description: searchProfile.description,
        status: searchProfile.status,
        preferences: prismaSearchProfileMapper.toPersistenceJson(searchProfile.preferences),
        updatedAt: searchProfile.updatedAt,
        lastMatchedAt: searchProfile.lastMatchedAt,
        version: { increment: 1 },
      },
    });

    if (count === 0) {
      const stillExists = await this.db.client.searchProfile.findUnique({
        where: { id: searchProfile.id },
        select: { id: true },
      });

      throw stillExists
        ? new SearchProfileConcurrentModificationError(searchProfile.id)
        : new SearchProfileNotFoundError(searchProfile.id);
    }

    return searchProfile.withVersion(searchProfile.version + 1);
  }

  async findById(id: string): Promise<SearchProfile | null> {
    const row = await this.db.client.searchProfile.findUnique({ where: { id } });

    return row ? prismaSearchProfileMapper.toDomain(row) : null;
  }

  async findAllByUserId(userId: string): Promise<SearchProfile[]> {
    const rows = await this.db.client.searchProfile.findMany({ where: { userId } });

    return rows.map((row) => prismaSearchProfileMapper.toDomain(row));
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.db.client.searchProfile.delete({ where: { id } });
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

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.db.client.searchProfile.deleteMany({ where: { userId } });
  }

  async findMany(params: FindManySearchProfilesParams): Promise<FindManySearchProfilesResult> {
    const where: Prisma.SearchProfileWhereInput = params.userId ? { userId: params.userId } : {};

    const [rows, total] = await Promise.all([
      this.db.client.searchProfile.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.client.searchProfile.count({ where }),
    ]);

    return { searchProfiles: rows.map((row) => prismaSearchProfileMapper.toDomain(row)), total };
  }
}
