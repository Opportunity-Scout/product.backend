import { CreateSearchProfileUseCase } from '@app/modules/searchProfile/application/createSearchProfile/CreateSearchProfileUseCase';
import { FakeSearchProfileRepository } from '../../../../helpers/fakeSearchProfileRepositoryHelper';

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

  it('fails without persisting when the name is blank, even with valid preferences', async () => {
    const repository = new FakeSearchProfileRepository();
    const useCase = new CreateSearchProfileUseCase(repository);

    const result = await useCase.execute({
      userId: 'user-1',
      name: '   ',
      preferences: { location: { remote: true, relocation: false } },
    });

    expect(result.isFailure).toBe(true);
    expect(repository.saved).toHaveLength(0);
  });
});
