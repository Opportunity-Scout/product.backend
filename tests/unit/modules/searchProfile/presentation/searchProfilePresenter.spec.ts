import { toSearchProfileResponse } from '@app/modules/searchProfile/presentation/searchProfilePresenter';
import { buildSearchProfile } from '../../../helpers/buildSearchProfileHelper';

describe('toSearchProfileResponse', () => {
  it('maps a search profile into a plain response object', () => {
    const profile = buildSearchProfile();

    const response = toSearchProfileResponse(profile);

    expect(response.id).toBe(profile.id);
    expect(response.userId).toBe(profile.userId);
    expect(response.name).toBe(profile.name);
    expect(response.status).toBe('active');
    expect(response.preferences.location.remote).toBe(true);
    expect(response.preferences.keywords).toEqual({ include: [], exclude: [] });
    expect(response.preferences.companies).toEqual({ include: [], exclude: [] });
  });

  it('maps every field of a fully populated search profile', () => {
    const profile = buildSearchProfile({
      description: 'Remote-friendly backend roles',
      preferences: {
        keywords: { include: ['nestjs'], exclude: ['php'] },
        location: { countries: ['CZ'], cities: ['Prague'], remote: false, relocation: true },
        compensation: { minimumSalary: 3000, currency: 'EUR' },
        seniority: ['middle', 'senior'],
        employmentTypes: ['full_time'],
        companies: { include: ['Google'], exclude: ['Meta'] },
        sources: ['dou'],
      },
    });

    const response = toSearchProfileResponse(profile);

    expect(response).toEqual({
      id: profile.id,
      userId: profile.userId,
      name: profile.name,
      description: 'Remote-friendly backend roles',
      status: 'active',
      preferences: {
        keywords: { include: ['nestjs'], exclude: ['php'] },
        location: { countries: ['CZ'], cities: ['Prague'], remote: false, relocation: true },
        compensation: { minimumSalary: 3000, currency: 'EUR' },
        seniority: ['middle', 'senior'],
        employmentTypes: ['full_time'],
        companies: { include: ['Google'], exclude: ['Meta'] },
        sources: ['dou'],
      },
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      lastMatchedAt: null,
    });
  });
});
