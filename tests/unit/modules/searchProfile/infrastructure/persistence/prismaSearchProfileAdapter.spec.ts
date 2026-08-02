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
});
