import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FakeSearchProfileRepository } from '../../../helpers/fakeSearchProfileRepositoryHelper';
import { buildSearchProfile } from '../../../helpers/buildSearchProfileHelper';
import { buildSearchProfilesController } from '../../../helpers/buildSearchProfilesControllerHelper';

describe('SearchProfilesController', () => {
  it('returns the presented search profile on success', async () => {
    const controller = buildSearchProfilesController();

    const response = await controller.create({
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: { location: { remote: true, relocation: false } },
    });

    expect(response.name).toBe('Backend Prague');
    expect(response.status).toBe('active');
  });

  it('responds with 400 when preferences are invalid', async () => {
    const controller = buildSearchProfilesController();

    await expect(
      controller.create({
        userId: 'user-1',
        name: 'Backend Prague',
        preferences: { location: { remote: false, relocation: false } },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns the presented search profile when found by id', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile();
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);

    const response = await controller.findById(profile.id);

    expect(response.id).toBe(profile.id);
    expect(response.name).toBe(profile.name);
  });

  it('responds with 404 when no search profile exists for the id', async () => {
    const controller = buildSearchProfilesController();

    await expect(controller.findById('missing-id')).rejects.toThrow(NotFoundException);
  });

  it('returns only the presented search profiles belonging to the given user', async () => {
    const repository = new FakeSearchProfileRepository();
    const ownProfile = buildSearchProfile({ userId: 'user-1' });
    const otherProfile = buildSearchProfile({ userId: 'user-2' });
    await repository.save(ownProfile);
    await repository.save(otherProfile);
    const controller = buildSearchProfilesController(repository);
    const response = await controller.list({ userId: 'user-1' });

    expect(response).toHaveLength(1);
    expect(response[0].id).toBe(ownProfile.id);
  });

  it('returns an empty array when the user has no search profiles', async () => {
    const controller = buildSearchProfilesController();
    const response = await controller.list({ userId: 'user-without-profiles' });

    expect(response).toEqual([]);
  });

  it('returns the presented search profile after pausing it', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile();
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);
    const response = await controller.pause(profile.id);

    expect(response.status).toBe('paused');
  });

  it('responds with 404 when pausing a search profile that does not exist', async () => {
    const controller = buildSearchProfilesController();

    await expect(controller.pause('missing-id')).rejects.toThrow(NotFoundException);
  });

  it('responds with 400 when pausing a search profile that is not active', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile();
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);
    await controller.pause(profile.id);

    await expect(controller.pause(profile.id)).rejects.toThrow(BadRequestException);
  });

  it('returns the presented search profile after activating it', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile();
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);
    await controller.pause(profile.id);
    const response = await controller.activate(profile.id);

    expect(response.status).toBe('active');
  });

  it('responds with 404 when activating a search profile that does not exist', async () => {
    const controller = buildSearchProfilesController();

    await expect(controller.activate('missing-id')).rejects.toThrow(NotFoundException);
  });

  it('responds with 400 when activating a search profile that is not paused', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile();
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);

    await expect(controller.activate(profile.id)).rejects.toThrow(BadRequestException);
  });

  it('returns the presented search profile after archiving it', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile();
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);
    const response = await controller.archive(profile.id);

    expect(response.status).toBe('archived');
  });

  it('responds with 404 when archiving a search profile that does not exist', async () => {
    const controller = buildSearchProfilesController();

    await expect(controller.archive('missing-id')).rejects.toThrow(NotFoundException);
  });

  it('responds with 400 when archiving a search profile that is already archived', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile();
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);
    await controller.archive(profile.id);

    await expect(controller.archive(profile.id)).rejects.toThrow(BadRequestException);
  });

  it('returns the presented search profile after updating its name', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ name: 'Backend Prague' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);
    const response = await controller.update(profile.id, { name: 'Senior Backend Prague' });

    expect(response.name).toBe('Senior Backend Prague');
  });

  it('responds with 404 when updating a search profile that does not exist', async () => {
    const controller = buildSearchProfilesController();

    await expect(controller.update('missing-id', { name: 'Senior Backend Prague' })).rejects.toThrow(NotFoundException);
  });

  it('responds with 400 when updating to invalid preferences', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile();
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);

    await expect(
      controller.update(profile.id, { preferences: { location: { remote: false, relocation: false } } }),
    ).rejects.toThrow(BadRequestException);
  });
});
