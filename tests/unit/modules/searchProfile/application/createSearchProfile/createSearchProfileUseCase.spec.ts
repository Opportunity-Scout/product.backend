import { CreateSearchProfileUseCase } from '@app/modules/searchProfile/application/createSearchProfile/CreateSearchProfileUseCase';
import { SearchProfileRepository } from '@app/modules/searchProfile/application/ports/SearchProfileRepository';
import { SearchProfile } from '@app/modules/searchProfile/domain/SearchProfile';

class FakeSearchProfileRepository implements SearchProfileRepository {
  public readonly saved: SearchProfile[] = [];

  save(searchProfile: SearchProfile): Promise<void> {
    this.saved.push(searchProfile);
    return Promise.resolve();
  }

  findById(id: string): Promise<SearchProfile | null> {
    return Promise.resolve(this.saved.find((profile) => profile.id === id) ?? null);
  }
}

describe('CreateSearchProfileUseCase', () => {
  it('creates and persists a search profile', async () => {
    const repository = new FakeSearchProfileRepository();
    const useCase = new CreateSearchProfileUseCase(repository);

    const result = await useCase.execute({
      userId: 'user-1',
      name: 'Senior QA Europe',
      preferences: { location: { remote: true, relocation: false } },
    });

    expect(result.isSuccess).toBe(true);
    expect(repository.saved).toHaveLength(1);
    expect(repository.saved[0].name).toBe('Senior QA Europe');
  });

  it('fails without persisting when preferences are invalid', async () => {
    const repository = new FakeSearchProfileRepository();
    const useCase = new CreateSearchProfileUseCase(repository);

    const result = await useCase.execute({
      userId: 'user-1',
      name: 'Invalid',
      preferences: { location: { remote: false, relocation: false } },
    });

    expect(result.isFailure).toBe(true);
    expect(repository.saved).toHaveLength(0);
  });
});
