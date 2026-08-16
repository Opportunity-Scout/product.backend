import { ListSearchProfilesAdminUseCase } from '@app/modules/searchProfile/application/listSearchProfilesAdmin/ListSearchProfilesAdminUseCase';
import { FakeSearchProfileRepository } from '../../../../helpers/fakeSearchProfileRepositoryHelper';
import { buildSearchProfile } from '../../../../helpers/buildSearchProfileHelper';

describe('ListSearchProfilesAdminUseCase', () => {
  it('returns a page of search profiles across all users and the total matching count', async () => {
    const repository = new FakeSearchProfileRepository();

    repository.saved.push(
      buildSearchProfile({ userId: 'user-1' }),
      buildSearchProfile({ userId: 'user-2' }),
      buildSearchProfile({ userId: 'user-3' }),
    );

    const useCase = new ListSearchProfilesAdminUseCase(repository);
    const result = await useCase.execute({ limit: 2, offset: 0 });

    expect(result.searchProfiles).toHaveLength(2);
    expect(result.total).toBe(3);
  });

  it('filters to a single userId when given', async () => {
    const repository = new FakeSearchProfileRepository();
    const match = buildSearchProfile({ userId: 'user-1' });
    repository.saved.push(match, buildSearchProfile({ userId: 'user-2' }));
    const useCase = new ListSearchProfilesAdminUseCase(repository);
    const result = await useCase.execute({ userId: 'user-1', limit: 20, offset: 0 });

    expect(result.searchProfiles).toEqual([match]);
    expect(result.total).toBe(1);
  });
});
