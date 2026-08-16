import { Prisma } from '@prisma/client';
import { PrismaSearchProfileAdapter } from '@app/modules/searchProfile/infrastructure/persistence/PrismaSearchProfileAdapter';
import { PrismaService } from '@app/common/persistence/PrismaService';
import { buildSearchProfile } from '../../../../helpers/buildSearchProfileHelper';
import { buildFakePrismaService } from '../../../../helpers/buildFakePrismaServiceHelper';

describe('PrismaSearchProfileAdapter', () => {
  it('upserts by id, sending a full row to create and a partial row (no id/createdAt) to update', async () => {
    const fakePrisma = buildFakePrismaService();
    const adapter = new PrismaSearchProfileAdapter(fakePrisma as unknown as PrismaService);
    const profile = buildSearchProfile();
    await adapter.save(profile);
    const call = fakePrisma.searchProfile.upsert.mock.calls[0][0];

    expect(fakePrisma.searchProfile.upsert).toHaveBeenCalledTimes(1);
    expect(call.where).toEqual({ id: profile.id });
    expect(call.create.id).toBe(profile.id);
    expect(call.create.createdAt).toBe(profile.createdAt);
    expect(call.update.id).toBeUndefined();
    expect(call.update.createdAt).toBeUndefined();
  });

  it('returns null when no row exists for the given id', async () => {
    const fakePrisma = buildFakePrismaService();
    fakePrisma.searchProfile.findUnique.mockResolvedValue(null);
    const adapter = new PrismaSearchProfileAdapter(fakePrisma as unknown as PrismaService);
    const found = await adapter.findById('missing-id');

    expect(found).toBeNull();
  });

  it('reconstitutes a search profile from a persisted row', async () => {
    const fakePrisma = buildFakePrismaService();
    const now = new Date('2026-01-01T00:00:00.000Z');

    fakePrisma.searchProfile.findUnique.mockResolvedValue({
      id: 'existing-id',
      userId: 'user-1',
      name: 'Backend Prague',
      description: null,
      status: 'active',
      preferences: { location: { remote: true, relocation: false } },
      createdAt: now,
      updatedAt: now,
      lastMatchedAt: null,
    });

    const adapter = new PrismaSearchProfileAdapter(fakePrisma as unknown as PrismaService);
    const found = await adapter.findById('existing-id');

    expect(found?.id).toBe('existing-id');
    expect(found?.name).toBe('Backend Prague');
    expect(found?.preferences.location.remote).toBe(true);
  });

  it('throws when the persisted preferences JSON fails domain validation', async () => {
    const fakePrisma = buildFakePrismaService();

    fakePrisma.searchProfile.findUnique.mockResolvedValue({
      id: 'corrupted-id',
      userId: 'user-1',
      name: 'Backend Prague',
      description: null,
      status: 'active',
      preferences: { location: { remote: false } },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMatchedAt: null,
    });

    const adapter = new PrismaSearchProfileAdapter(fakePrisma as unknown as PrismaService);

    await expect(adapter.findById('corrupted-id')).rejects.toThrow();
  });

  it('returns all search profiles for a user id', async () => {
    const fakePrisma = buildFakePrismaService();
    const now = new Date('2026-01-01T00:00:00.000Z');

    fakePrisma.searchProfile.findMany.mockResolvedValue([
      {
        id: 'profile-1',
        userId: 'user-1',
        name: 'Backend Prague',
        description: null,
        status: 'active',
        preferences: { location: { remote: true, relocation: false } },
        createdAt: now,
        updatedAt: now,
        lastMatchedAt: null,
      },
      {
        id: 'profile-2',
        userId: 'user-1',
        name: 'Frontend Berlin',
        description: null,
        status: 'paused',
        preferences: { location: { remote: true, relocation: false } },
        createdAt: now,
        updatedAt: now,
        lastMatchedAt: null,
      },
    ]);

    const adapter = new PrismaSearchProfileAdapter(fakePrisma as unknown as PrismaService);
    const found = await adapter.findAllByUserId('user-1');
    const call = fakePrisma.searchProfile.findMany.mock.calls[0][0];

    expect(call.where).toEqual({ userId: 'user-1' });
    expect(found).toHaveLength(2);
    expect(found[0].id).toBe('profile-1');
    expect(found[1].id).toBe('profile-2');
  });

  it('returns an empty array when the user has no search profiles', async () => {
    const fakePrisma = buildFakePrismaService();
    fakePrisma.searchProfile.findMany.mockResolvedValue([]);
    const adapter = new PrismaSearchProfileAdapter(fakePrisma as unknown as PrismaService);
    const found = await adapter.findAllByUserId('user-without-profiles');

    expect(found).toEqual([]);
  });

  it('queries with an empty where clause and paginates when no userId filter is given', async () => {
    const fakePrisma = buildFakePrismaService();
    fakePrisma.searchProfile.count.mockResolvedValue(5);
    const adapter = new PrismaSearchProfileAdapter(fakePrisma as unknown as PrismaService);
    const result = await adapter.findMany({ limit: 20, offset: 0 });
    const findManyCall = fakePrisma.searchProfile.findMany.mock.calls[0][0];

    expect(findManyCall.where).toEqual({});
    expect(findManyCall.take).toBe(20);
    expect(findManyCall.skip).toBe(0);
    expect(result.total).toBe(5);
  });

  it('filters by userId when given', async () => {
    const fakePrisma = buildFakePrismaService();
    const adapter = new PrismaSearchProfileAdapter(fakePrisma as unknown as PrismaService);
    await adapter.findMany({ userId: 'user-1', limit: 20, offset: 0 });
    const findManyCall = fakePrisma.searchProfile.findMany.mock.calls[0][0];
    const countCall = fakePrisma.searchProfile.count.mock.calls[0][0];

    expect(findManyCall.where).toEqual({ userId: 'user-1' });
    expect(countCall.where).toEqual({ userId: 'user-1' });
  });

  it('deletes the row by id', async () => {
    const fakePrisma = buildFakePrismaService();
    const adapter = new PrismaSearchProfileAdapter(fakePrisma as unknown as PrismaService);
    await adapter.deleteById('profile-1');

    expect(fakePrisma.searchProfile.delete).toHaveBeenCalledWith({ where: { id: 'profile-1' } });
  });

  it('swallows a P2025 (already deleted) error as a successful no-op', async () => {
    const fakePrisma = buildFakePrismaService();

    fakePrisma.searchProfile.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('No record found', { code: 'P2025', clientVersion: 'test' }),
    );

    const adapter = new PrismaSearchProfileAdapter(fakePrisma as unknown as PrismaService);

    await expect(adapter.deleteById('profile-1')).resolves.toBeUndefined();
  });

  it('rethrows a Prisma error that is not P2025', async () => {
    const fakePrisma = buildFakePrismaService();

    fakePrisma.searchProfile.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }),
    );
    const adapter = new PrismaSearchProfileAdapter(fakePrisma as unknown as PrismaService);

    await expect(adapter.deleteById('profile-1')).rejects.toThrow('Unique constraint failed');
  });

  it('rethrows a non-Prisma error', async () => {
    const fakePrisma = buildFakePrismaService();
    fakePrisma.searchProfile.delete.mockRejectedValue(new Error('connection lost'));
    const adapter = new PrismaSearchProfileAdapter(fakePrisma as unknown as PrismaService);

    await expect(adapter.deleteById('profile-1')).rejects.toThrow('connection lost');
  });
});
