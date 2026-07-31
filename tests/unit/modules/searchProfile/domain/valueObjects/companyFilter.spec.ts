import { CompanyFilter } from '@app/modules/searchProfile/domain/valueObjects/CompanyFilter';

describe('CompanyFilter', () => {
  it('defaults to empty include/exclude when no props are given', () => {
    const filter = CompanyFilter.create();

    expect(filter.include).toEqual([]);
    expect(filter.exclude).toEqual([]);
  });

  it('keeps the provided include/exclude lists', () => {
    const filter = CompanyFilter.create({ include: ['Google'], exclude: ['Meta'] });

    expect(filter.include).toEqual(['Google']);
    expect(filter.exclude).toEqual(['Meta']);
  });
});
