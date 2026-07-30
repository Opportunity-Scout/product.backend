import { SearchProfile } from '../domain/SearchProfile';

export function toSearchProfileResponse(searchProfile: SearchProfile) {
  const preferences = searchProfile.preferences;

  return {
    id: searchProfile.id,
    userId: searchProfile.userId,
    name: searchProfile.name,
    description: searchProfile.description,
    status: searchProfile.status,
    preferences: {
      keywords: {
        include: preferences.keywords.include,
        exclude: preferences.keywords.exclude,
      },
      location: {
        countries: preferences.location.countries,
        cities: preferences.location.cities,
        remote: preferences.location.remote,
        relocation: preferences.location.relocation,
      },
      compensation: {
        minimumSalary: preferences.compensation.minimumSalary,
        currency: preferences.compensation.currency,
      },
      seniority: preferences.seniority,
      employmentTypes: preferences.employmentTypes,
      companies: {
        include: preferences.companies.include,
        exclude: preferences.companies.exclude,
      },
      sources: preferences.sources,
    },
    createdAt: searchProfile.createdAt,
    updatedAt: searchProfile.updatedAt,
    lastMatchedAt: searchProfile.lastMatchedAt,
  };
}
