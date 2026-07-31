import { SearchPreferences } from '@app/modules/searchProfile/domain/SearchPreferences';
import { SearchProfile } from '@app/modules/searchProfile/domain/SearchProfile';
import { BuildSearchProfileOverrides } from '../interfaces';

export function buildSearchProfile(overrides: BuildSearchProfileOverrides = {}): SearchProfile {
  const preferencesResult = SearchPreferences.create(
    overrides.preferences ?? { location: { remote: true, relocation: false } },
  );
  if (preferencesResult.isFailure) {
    throw preferencesResult.error;
  }

  const profileResult = SearchProfile.create({
    userId: 'user-1',
    name: overrides.name ?? 'Backend Prague',
    description: overrides.description,
    preferences: preferencesResult.value,
  });
  if (profileResult.isFailure) {
    throw profileResult.error;
  }

  return profileResult.value;
}
