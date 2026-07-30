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
});
