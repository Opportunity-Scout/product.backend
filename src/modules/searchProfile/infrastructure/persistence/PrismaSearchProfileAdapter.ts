import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/common/persistence/PrismaService';
import { SearchProfile } from '../../domain/SearchProfile';
import { SearchProfileRepository } from '../../application/ports/SearchProfileRepository';
import { FindManySearchProfilesParams } from '../../application/ports/interfaces/FindManySearchProfilesParams';
import { FindManySearchProfilesResult } from '../../application/ports/interfaces/FindManySearchProfilesResult';
import { prismaSearchProfileMapper } from './helpers/prismaSearchProfileMapperHelper';

@Injectable()
export class PrismaSearchProfileAdapter implements SearchProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(searchProfile: SearchProfile): Promise<void> {
    const preferences = prismaSearchProfileMapper.toPersistenceJson(searchProfile.preferences);

    await this.prisma.searchProfile.upsert({
      where: { id: searchProfile.id },
      create: {
        id: searchProfile.id,
        userId: searchProfile.userId,
        name: searchProfile.name,
        description: searchProfile.description,
        status: searchProfile.status,
        preferences,
        createdAt: searchProfile.createdAt,
        updatedAt: searchProfile.updatedAt,
        lastMatchedAt: searchProfile.lastMatchedAt,
      },
      update: {
        userId: searchProfile.userId,
        name: searchProfile.name,
        description: searchProfile.description,
        status: searchProfile.status,
        preferences,
        updatedAt: searchProfile.updatedAt,
        lastMatchedAt: searchProfile.lastMatchedAt,
      },
    });
  }

  async findById(id: string): Promise<SearchProfile | null> {
    const row = await this.prisma.searchProfile.findUnique({ where: { id } });

    return row ? prismaSearchProfileMapper.toDomain(row) : null;
  }

  async findAllByUserId(userId: string): Promise<SearchProfile[]> {
    const rows = await this.prisma.searchProfile.findMany({ where: { userId } });

    return rows.map((row) => prismaSearchProfileMapper.toDomain(row));
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.prisma.searchProfile.delete({ where: { id } });
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
    await this.prisma.searchProfile.deleteMany({ where: { userId } });
  }

  async findMany(params: FindManySearchProfilesParams): Promise<FindManySearchProfilesResult> {
    const where: Prisma.SearchProfileWhereInput = params.userId ? { userId: params.userId } : {};

    const [rows, total] = await Promise.all([
      this.prisma.searchProfile.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.searchProfile.count({ where }),
    ]);

    return { searchProfiles: rows.map((row) => prismaSearchProfileMapper.toDomain(row)), total };
  }
}
