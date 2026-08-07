import { GetSearchProfileUseCase } from '@app/modules/searchProfile/application/getSearchProfile/GetSearchProfileUseCase';
import { SearchProfileNotFoundError } from '@app/modules/searchProfile/application/errors/SearchProfileNotFoundError';
import { FakeSearchProfileRepository } from '../../../../helpers/fakeSearchProfileRepositoryHelper';
import { buildSearchProfile } from '../../../../helpers/buildSearchProfileHelper';

describe('GetSearchProfileUseCase', () => {
  it('returns the search profile when it exists and belongs to the caller', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const useCase = new GetSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: profile.id, userId: 'user-1' });

    expect(result.isSuccess).toBe(true);
    expect(result.value.id).toBe(profile.id);
  });

  it('fails when no search profile exists for the id', async () => {
    const repository = new FakeSearchProfileRepository();
    const useCase = new GetSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: 'missing-id', userId: 'user-1' });

    expect(result.isFailure).toBe(true);
  });

  it('fails with the same not-found error when the profile belongs to a different user', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const useCase = new GetSearchProfileUseCase(repository);
    const result = await useCase.execute({ id: profile.id, userId: 'user-2' });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(SearchProfileNotFoundError);
  });
});
