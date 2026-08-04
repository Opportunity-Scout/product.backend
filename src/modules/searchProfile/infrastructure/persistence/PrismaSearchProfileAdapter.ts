import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/common/persistence/PrismaService';
import { SearchProfile } from '../../domain/SearchProfile';
import { SearchProfileRepository } from '../../application/ports/SearchProfileRepository';
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
}
