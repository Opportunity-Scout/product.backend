import { LocationFilter } from '@app/modules/searchProfile/domain/valueObjects/LocationFilter';

describe('LocationFilter', () => {
  it('accepts remote=true without a country', () => {
    const result = LocationFilter.create({ remote: true, relocation: false });

    expect(result.isSuccess).toBe(true);
    expect(result.value.countries).toEqual([]);
  });

  it('accepts remote=false with at least one country', () => {
    const result = LocationFilter.create({ remote: false, relocation: false, countries: ['CZ'] });

    expect(result.isSuccess).toBe(true);
    expect(result.value.countries).toEqual(['CZ']);
  });

  it('rejects remote=false without a country', () => {
    const result = LocationFilter.create({ remote: false, relocation: false });

    expect(result.isFailure).toBe(true);
  });

  it('defaults relocation to false when omitted', () => {
    const result = LocationFilter.create({ remote: true });

    expect(result.isSuccess).toBe(true);
    expect(result.value.relocation).toBe(false);
  });

  it('defaults cities to an empty list', () => {
    const result = LocationFilter.create({ remote: true, relocation: true });

    expect(result.isSuccess).toBe(true);
    expect(result.value.cities).toEqual([]);
  });

  it('keeps the provided cities', () => {
    const result = LocationFilter.create({ remote: true, relocation: false, cities: ['Prague'] });

    expect(result.isSuccess).toBe(true);
    expect(result.value.cities).toEqual(['Prague']);
  });
});
