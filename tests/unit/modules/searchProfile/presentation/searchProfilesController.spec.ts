import { BadRequestException } from '@nestjs/common';
import { SearchProfilesController } from '@app/modules/searchProfile/presentation/SearchProfilesController';
import { CreateSearchProfileUseCase } from '@app/modules/searchProfile/application/createSearchProfile/CreateSearchProfileUseCase';
import { FakeSearchProfileRepository } from '../../../helpers/fakeSearchProfileRepositoryHelper';

describe('SearchProfilesController', () => {
  it('returns the presented search profile on success', async () => {
    const useCase = new CreateSearchProfileUseCase(new FakeSearchProfileRepository());
    const controller = new SearchProfilesController(useCase);

    const response = await controller.create({
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: { location: { remote: true, relocation: false } },
    });

    expect(response.name).toBe('Backend Prague');
    expect(response.status).toBe('active');
  });

  it('responds with 400 when preferences are invalid', async () => {
    const useCase = new CreateSearchProfileUseCase(new FakeSearchProfileRepository());
    const controller = new SearchProfilesController(useCase);

    await expect(
      controller.create({
        userId: 'user-1',
        name: 'Backend Prague',
        preferences: { location: { remote: false, relocation: false } },
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
