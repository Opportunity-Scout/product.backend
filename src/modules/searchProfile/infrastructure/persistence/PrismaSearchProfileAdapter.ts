import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/common/persistence/PrismaService';
import { SearchProfile } from '../../domain/SearchProfile';
import { SearchPreferences } from '../../domain/SearchPreferences';
import { SearchPreferencesProps } from '../../domain/interfaces/SearchPreferencesProps';
import { SearchProfileRepository } from '../../application/ports/SearchProfileRepository';

function toPreferencesJson(preferences: SearchPreferences): Prisma.InputJsonValue {
  const props: SearchPreferencesProps = {
    keywords: { include: preferences.keywords.include, exclude: preferences.keywords.exclude },
    location: {
      countries: preferences.location.countries,
      cities: preferences.location.cities,
      remote: preferences.location.remote,
      relocation: preferences.location.relocation,
    },
    compensation: {
      minimumSalary: preferences.compensation.minimumSalary ?? undefined,
      currency: preferences.compensation.currency ?? undefined,
    },
    seniority: preferences.seniority,
    employmentTypes: preferences.employmentTypes,
    companies: { include: preferences.companies.include, exclude: preferences.companies.exclude },
    sources: preferences.sources,
  };

  return props as unknown as Prisma.InputJsonValue;
}

@Injectable()
export class PrismaSearchProfileAdapter implements SearchProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(searchProfile: SearchProfile): Promise<void> {
    const preferences = toPreferencesJson(searchProfile.preferences);

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

    if (!row) {
      return null;
    }

    const preferencesResult = SearchPreferences.create(row.preferences as unknown as SearchPreferencesProps);

    if (preferencesResult.isFailure) {
      throw preferencesResult.error;
    }

    return SearchProfile.reconstitute({
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
      status: row.status,
      preferences: preferencesResult.value,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastMatchedAt: row.lastMatchedAt,
    });
  }
}
