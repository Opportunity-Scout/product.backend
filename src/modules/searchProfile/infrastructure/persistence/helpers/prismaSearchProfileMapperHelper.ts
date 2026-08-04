import { Prisma, SearchProfile as SearchProfileRow } from '@prisma/client';
import { SearchProfile } from '../../../domain/SearchProfile';
import { SearchPreferences } from '../../../domain/SearchPreferences';
import { SearchPreferencesProps } from '../../../domain/interfaces/SearchPreferencesProps';

class PrismaSearchProfileMapper {
  toDomain(row: SearchProfileRow): SearchProfile {
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

  toPersistenceJson(preferences: SearchPreferences): Prisma.InputJsonValue {
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
}

export const prismaSearchProfileMapper = new PrismaSearchProfileMapper();
