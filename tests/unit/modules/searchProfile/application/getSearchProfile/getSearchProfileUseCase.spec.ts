import { GetSearchProfileUseCase } from '@app/modules/searchProfile/application/getSearchProfile/GetSearchProfileUseCase';
import { FakeSearchProfileRepository } from '../../../../helpers/fakeSearchProfileRepositoryHelper';
import { buildSearchProfile } from '../../../../helpers/buildSearchProfileHelper';

describe('GetSearchProfileUseCase', () => {
  it('returns the search profile when it exists', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile();
    await repository.save(profile);
    const useCase = new GetSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: profile.id });

    expect(result.isSuccess).toBe(true);
    expect(result.value.id).toBe(profile.id);
  });

  it('fails when no search profile exists for the id', async () => {
    const repository = new FakeSearchProfileRepository();
    const useCase = new GetSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: 'missing-id' });

    expect(result.isFailure).toBe(true);
  });
});
