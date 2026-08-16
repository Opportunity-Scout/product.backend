import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FakeSearchProfileRepository } from '../../../helpers/fakeSearchProfileRepositoryHelper';
import { FakeUserRepository } from '../../../helpers/fakeUserRepositoryHelper';
import { buildSearchProfile } from '../../../helpers/buildSearchProfileHelper';
import { buildUser } from '../../../helpers/buildUserHelper';
import { buildSearchProfilesController } from '../../../helpers/buildSearchProfilesControllerHelper';

describe('SearchProfilesController', () => {
  it('returns the presented search profile on success', async () => {
    const controller = buildSearchProfilesController();

    const response = await controller.create('user-1', {
      name: 'Backend Prague',
      preferences: { location: { remote: true, relocation: false } },
    });

    expect(response.name).toBe('Backend Prague');
    expect(response.status).toBe('active');
  });

  it('responds with 400 when preferences are invalid', async () => {
    const controller = buildSearchProfilesController();

    await expect(
      controller.create('user-1', {
        name: 'Backend Prague',
        preferences: { location: { remote: false, relocation: false } },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates a search profile on behalf of the given user via the admin endpoint', async () => {
    const controller = buildSearchProfilesController();

    const response = await controller.createAdmin({
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: { location: { remote: true, relocation: false } },
    });

    expect(response.userId).toBe('user-1');
    expect(response.name).toBe('Backend Prague');
  });

  it('responds with 404 when the admin create endpoint targets a nonexistent user', async () => {
    const controller = buildSearchProfilesController();

    await expect(
      controller.createAdmin({
        userId: 'no-such-user',
        name: 'Backend Prague',
        preferences: { location: { remote: true, relocation: false } },
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns the presented search profile when found by id', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);

    const response = await controller.findById('user-1', profile.id);

    expect(response.id).toBe(profile.id);
    expect(response.name).toBe(profile.name);
  });

  it('responds with 404 when no search profile exists for the id', async () => {
    const controller = buildSearchProfilesController();

    await expect(controller.findById('user-1', 'missing-id')).rejects.toThrow(NotFoundException);
  });

  it('responds with 404 when the search profile belongs to a different user', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);

    await expect(controller.findById('user-2', profile.id)).rejects.toThrow(NotFoundException);
  });

  it('returns the presented search profile for an admin caller even when it belongs to someone else', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const admin = buildUser({ id: 'admin-user', role: 'admin' });
    userRepository.saved.push(admin);
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository, userRepository);
    const response = await controller.findById(admin.id, profile.id);

    expect(response.id).toBe(profile.id);
  });

  it('returns a paginated page of search profiles for the admin list endpoint', async () => {
    const repository = new FakeSearchProfileRepository();
    await repository.save(buildSearchProfile({ userId: 'user-1' }));
    await repository.save(buildSearchProfile({ userId: 'user-2' }));
    const controller = buildSearchProfilesController(repository);
    const response = await controller.listAdmin({ limit: 1, offset: 0 });

    expect(response.total).toBe(2);
    expect(response.searchProfiles).toHaveLength(1);
    expect(response.limit).toBe(1);
    expect(response.offset).toBe(0);
  });

  it('deletes the search profile when the caller owns it', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);
    await controller.deleteSearchProfile('user-1', profile.id);

    expect(await repository.findById(profile.id)).toBeNull();
  });

  it('responds with 404 when deleting a search profile that belongs to a different user', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);

    await expect(controller.deleteSearchProfile('user-2', profile.id)).rejects.toThrow(NotFoundException);
  });

  it('lets an admin caller delete a search profile that belongs to someone else', async () => {
    const repository = new FakeSearchProfileRepository();
    const userRepository = new FakeUserRepository();
    const admin = buildUser({ id: 'admin-user', role: 'admin' });
    userRepository.saved.push(admin);
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository, userRepository);
    await controller.deleteSearchProfile(admin.id, profile.id);

    expect(await repository.findById(profile.id)).toBeNull();
  });

  it('returns only the presented search profiles belonging to the given user', async () => {
    const repository = new FakeSearchProfileRepository();
    const ownProfile = buildSearchProfile({ userId: 'user-1' });
    const otherProfile = buildSearchProfile({ userId: 'user-2' });
    await repository.save(ownProfile);
    await repository.save(otherProfile);
    const controller = buildSearchProfilesController(repository);
    const response = await controller.list('user-1');

    expect(response).toHaveLength(1);
    expect(response[0].id).toBe(ownProfile.id);
  });

  it('returns an empty array when the user has no search profiles', async () => {
    const controller = buildSearchProfilesController();
    const response = await controller.list('user-without-profiles');

    expect(response).toEqual([]);
  });

  it('returns the presented search profile after pausing it', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);
    const response = await controller.pause('user-1', profile.id);

    expect(response.status).toBe('paused');
  });

  it('responds with 404 when pausing a search profile that does not exist', async () => {
    const controller = buildSearchProfilesController();

    await expect(controller.pause('user-1', 'missing-id')).rejects.toThrow(NotFoundException);
  });

  it('responds with 400 when pausing a search profile that is not active', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);
    await controller.pause('user-1', profile.id);

    await expect(controller.pause('user-1', profile.id)).rejects.toThrow(BadRequestException);
  });

  it('responds with 404 when pausing a search profile that belongs to a different user', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);

    await expect(controller.pause('user-2', profile.id)).rejects.toThrow(NotFoundException);
  });

  it('returns the presented search profile after activating it', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);
    await controller.pause('user-1', profile.id);
    const response = await controller.activate('user-1', profile.id);

    expect(response.status).toBe('active');
  });

  it('responds with 404 when activating a search profile that does not exist', async () => {
    const controller = buildSearchProfilesController();

    await expect(controller.activate('user-1', 'missing-id')).rejects.toThrow(NotFoundException);
  });

  it('responds with 400 when activating a search profile that is not paused', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);

    await expect(controller.activate('user-1', profile.id)).rejects.toThrow(BadRequestException);
  });

  it('responds with 404 when activating a search profile that belongs to a different user', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);

    await expect(controller.activate('user-2', profile.id)).rejects.toThrow(NotFoundException);
  });

  it('returns the presented search profile after archiving it', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);
    const response = await controller.archive('user-1', profile.id);

    expect(response.status).toBe('archived');
  });

  it('responds with 404 when archiving a search profile that does not exist', async () => {
    const controller = buildSearchProfilesController();

    await expect(controller.archive('user-1', 'missing-id')).rejects.toThrow(NotFoundException);
  });

  it('responds with 400 when archiving a search profile that is already archived', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);
    await controller.archive('user-1', profile.id);

    await expect(controller.archive('user-1', profile.id)).rejects.toThrow(BadRequestException);
  });

  it('responds with 404 when archiving a search profile that belongs to a different user', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);

    await expect(controller.archive('user-2', profile.id)).rejects.toThrow(NotFoundException);
  });

  it('returns the presented search profile after updating its name', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1', name: 'Backend Prague' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);
    const response = await controller.update('user-1', profile.id, { name: 'Senior Backend Prague' });

    expect(response.name).toBe('Senior Backend Prague');
  });

  it('responds with 404 when updating a search profile that does not exist', async () => {
    const controller = buildSearchProfilesController();

    await expect(controller.update('user-1', 'missing-id', { name: 'Senior Backend Prague' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('responds with 400 when updating to invalid preferences', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);

    await expect(
      controller.update('user-1', profile.id, { preferences: { location: { remote: false, relocation: false } } }),
    ).rejects.toThrow(BadRequestException);
  });

  it('responds with 404 when updating a search profile that belongs to a different user', async () => {
    const repository = new FakeSearchProfileRepository();
    const profile = buildSearchProfile({ userId: 'user-1' });
    await repository.save(profile);
    const controller = buildSearchProfilesController(repository);

    await expect(controller.update('user-2', profile.id, { name: 'Senior Backend Prague' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
