import { ListSearchProfilesUseCase } from '@app/modules/searchProfile/application/listSearchProfiles/ListSearchProfilesUseCase';
import { FakeSearchProfileRepository } from '../../../../helpers/fakeSearchProfileRepositoryHelper';
import { buildSearchProfile } from '../../../../helpers/buildSearchProfileHelper';

describe('ListSearchProfilesUseCase', () => {
  it('returns only the search profiles belonging to the given user', async () => {
    const repository = new FakeSearchProfileRepository();
    const ownProfile = buildSearchProfile({ userId: 'user-1', name: 'Backend Prague' });
    const otherProfile = buildSearchProfile({ userId: 'user-2', name: 'Someone else' });
    await repository.save(ownProfile);
    await repository.save(otherProfile);
    const useCase = new ListSearchProfilesUseCase(repository);
    const result = await useCase.execute({ userId: ownProfile.userId });

    expect(result).toEqual([ownProfile]);
  });

  it('returns an empty array when the user has no search profiles', async () => {
    const repository = new FakeSearchProfileRepository();
    const useCase = new ListSearchProfilesUseCase(repository);
    const result = await useCase.execute({ userId: 'user-without-profiles' });

    expect(result).toEqual([]);
  });
});
