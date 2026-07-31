import { SearchPreferences } from '@app/modules/searchProfile/domain/SearchPreferences';

describe('SearchPreferences', () => {
  it('rejects a non-remote location with no country', () => {
    const result = SearchPreferences.create({ location: { remote: false, relocation: false } });

    expect(result.isFailure).toBe(true);
  });

  it('rejects a negative minimum salary', () => {
    const result = SearchPreferences.create({
      location: { remote: true, relocation: false },
      compensation: { minimumSalary: -100 },
    });

    expect(result.isFailure).toBe(true);
  });

  it('accepts a remote location without a country', () => {
    const result = SearchPreferences.create({ location: { remote: true, relocation: false } });

    expect(result.isSuccess).toBe(true);
    expect(result.value.location.countries).toEqual([]);
  });

  it('defaults relocation to false when omitted', () => {
    const result = SearchPreferences.create({ location: { remote: true } });

    expect(result.isSuccess).toBe(true);
    expect(result.value.location.relocation).toBe(false);
  });

  it('keeps all provided fields', () => {
    const result = SearchPreferences.create({
      keywords: { include: ['nestjs'], exclude: ['php'] },
      location: { countries: ['CZ'], cities: ['Prague'], remote: false, relocation: true },
      compensation: { minimumSalary: 3000, currency: 'EUR' },
      seniority: ['middle', 'senior'],
      employmentTypes: ['full_time'],
      companies: { include: ['Google'], exclude: ['Meta'] },
      sources: ['dou'],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.keywords.include).toEqual(['nestjs']);
    expect(result.value.keywords.exclude).toEqual(['php']);
    expect(result.value.location.countries).toEqual(['CZ']);
    expect(result.value.location.cities).toEqual(['Prague']);
    expect(result.value.location.remote).toBe(false);
    expect(result.value.location.relocation).toBe(true);
    expect(result.value.compensation.minimumSalary).toBe(3000);
    expect(result.value.compensation.currency).toBe('EUR');
    expect(result.value.seniority).toEqual(['middle', 'senior']);
    expect(result.value.employmentTypes).toEqual(['full_time']);
    expect(result.value.companies.include).toEqual(['Google']);
    expect(result.value.companies.exclude).toEqual(['Meta']);
    expect(result.value.sources).toEqual(['dou']);
  });
});
