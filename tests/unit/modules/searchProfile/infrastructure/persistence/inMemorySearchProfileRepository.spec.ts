import { InMemorySearchProfileRepository } from '@app/modules/searchProfile/infrastructure/persistence/InMemorySearchProfileRepository';
import { buildSearchProfile } from '../../../../helpers/buildSearchProfileHelper';

describe('InMemorySearchProfileRepository', () => {
  it('returns null for an id that was never saved', async () => {
    const repository = new InMemorySearchProfileRepository();

    const found = await repository.findById('missing-id');

    expect(found).toBeNull();
  });

  it('finds a saved search profile by id', async () => {
    const repository = new InMemorySearchProfileRepository();
    const profile = buildSearchProfile();

    await repository.save(profile);
    const found = await repository.findById(profile.id);

    expect(found).toBe(profile);
  });

  it('overwrites a search profile saved again under the same id', async () => {
    const repository = new InMemorySearchProfileRepository();
    const profile = buildSearchProfile();

    await repository.save(profile);
    await repository.save(profile);
    const found = await repository.findById(profile.id);

    expect(found).toBe(profile);
  });
});
