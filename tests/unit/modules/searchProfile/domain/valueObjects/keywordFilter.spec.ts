import { KeywordFilter } from '@app/modules/searchProfile/domain/valueObjects/KeywordFilter';

describe('KeywordFilter', () => {
  it('defaults to empty include/exclude when no props are given', () => {
    const filter = KeywordFilter.create();

    expect(filter.include).toEqual([]);
    expect(filter.exclude).toEqual([]);
  });

  it('keeps the provided include/exclude lists', () => {
    const filter = KeywordFilter.create({ include: ['nestjs'], exclude: ['php'] });

    expect(filter.include).toEqual(['nestjs']);
    expect(filter.exclude).toEqual(['php']);
  });
});
