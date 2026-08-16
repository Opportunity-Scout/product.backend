import { Prisma } from '@prisma/client';
import { PrismaUserAdapter } from '@app/modules/user/infrastructure/persistence/PrismaUserAdapter';
import { PrismaService } from '@app/common/persistence/PrismaService';
import { buildUser } from '../../../../helpers/buildUserHelper';
import { buildFakePrismaService } from '../../../../helpers/buildFakePrismaServiceHelper';

describe('PrismaUserAdapter', () => {
  it('upserts by id, sending a full row to create and a partial row (no id/createdAt) to update', async () => {
    const fakePrisma = buildFakePrismaService();
    const adapter = new PrismaUserAdapter(fakePrisma as unknown as PrismaService);
    const user = buildUser();

    await adapter.save(user);
    const call = fakePrisma.user.upsert.mock.calls[0][0];

    expect(fakePrisma.user.upsert).toHaveBeenCalledTimes(1);
    expect(call.where).toEqual({ id: user.id });
    expect(call.create.id).toBe(user.id);
    expect(call.create.createdAt).toBe(user.createdAt);
    expect(call.create.role).toBe('user');
    expect(call.create.searchProfileLimit).toBe(1);
    expect(call.update.id).toBeUndefined();
    expect(call.update.createdAt).toBeUndefined();
    expect(call.update.role).toBe('user');
    expect(call.update.searchProfileLimit).toBe(1);
  });

  it('returns null when no row exists for the given id', async () => {
    const fakePrisma = buildFakePrismaService();
    fakePrisma.user.findUnique.mockResolvedValue(null);
    const adapter = new PrismaUserAdapter(fakePrisma as unknown as PrismaService);
    const found = await adapter.findById('missing-id');

    expect(found).toBeNull();
  });

  it('reconstitutes a user from a persisted row found by id', async () => {
    const fakePrisma = buildFakePrismaService();
    const now = new Date('2026-01-01T00:00:00.000Z');

    fakePrisma.user.findUnique.mockResolvedValue({
      id: 'existing-id',
      telegramUserId: '12345',
      telegramUsername: 'oleg',
      role: 'admin',
      searchProfileLimit: 3,
      createdAt: now,
    });

    const adapter = new PrismaUserAdapter(fakePrisma as unknown as PrismaService);
    const found = await adapter.findById('existing-id');

    expect(found?.id).toBe('existing-id');
    expect(found?.telegramUserId).toBe('12345');
    expect(found?.telegramUsername).toBe('oleg');
    expect(found?.role).toBe('admin');
    expect(found?.searchProfileLimit).toBe(3);
  });

  it('returns null when no row exists for the given telegram id', async () => {
    const fakePrisma = buildFakePrismaService();
    fakePrisma.user.findUnique.mockResolvedValue(null);
    const adapter = new PrismaUserAdapter(fakePrisma as unknown as PrismaService);
    const found = await adapter.findByTelegramUserId('missing-telegram-id');

    expect(found).toBeNull();
  });

  it('reconstitutes a user from a persisted row found by telegram id', async () => {
    const fakePrisma = buildFakePrismaService();
    const now = new Date('2026-01-01T00:00:00.000Z');

    fakePrisma.user.findUnique.mockResolvedValue({
      id: 'existing-id',
      telegramUserId: '12345',
      telegramUsername: null,
      role: 'user',
      searchProfileLimit: 1,
      createdAt: now,
    });

    const adapter = new PrismaUserAdapter(fakePrisma as unknown as PrismaService);
    const found = await adapter.findByTelegramUserId('12345');
    const call = fakePrisma.user.findUnique.mock.calls[0][0];

    expect(call.where).toEqual({ telegramUserId: '12345' });
    expect(found?.telegramUserId).toBe('12345');
    expect(found?.telegramUsername).toBeNull();
  });

  it('queries with an empty where clause and maps rows when no search term is given', async () => {
    const fakePrisma = buildFakePrismaService();
    const now = new Date('2026-01-01T00:00:00.000Z');

    fakePrisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        telegramUserId: '1',
        telegramUsername: null,
        role: 'user',
        searchProfileLimit: 1,
        createdAt: now,
      },
    ]);
    fakePrisma.user.count.mockResolvedValue(1);

    const adapter = new PrismaUserAdapter(fakePrisma as unknown as PrismaService);
    const result = await adapter.findMany({ limit: 20, offset: 0 });
    const findManyCall = fakePrisma.user.findMany.mock.calls[0][0];

    expect(findManyCall.where).toEqual({});
    expect(findManyCall.take).toBe(20);
    expect(findManyCall.skip).toBe(0);
    expect(result.users).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('filters by a case-insensitive telegramUsername search term', async () => {
    const fakePrisma = buildFakePrismaService();
    const adapter = new PrismaUserAdapter(fakePrisma as unknown as PrismaService);
    await adapter.findMany({ search: 'oleh', limit: 20, offset: 0 });
    const findManyCall = fakePrisma.user.findMany.mock.calls[0][0];
    const countCall = fakePrisma.user.count.mock.calls[0][0];

    expect(findManyCall.where).toEqual({ telegramUsername: { contains: 'oleh', mode: 'insensitive' } });
    expect(countCall.where).toEqual({ telegramUsername: { contains: 'oleh', mode: 'insensitive' } });
  });

  it('deletes the row by id', async () => {
    const fakePrisma = buildFakePrismaService();
    const adapter = new PrismaUserAdapter(fakePrisma as unknown as PrismaService);
    await adapter.deleteById('user-1');

    expect(fakePrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });

  it('swallows a P2025 (already deleted) error as a successful no-op', async () => {
    const fakePrisma = buildFakePrismaService();

    fakePrisma.user.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('No record found', { code: 'P2025', clientVersion: 'test' }),
    );

    const adapter = new PrismaUserAdapter(fakePrisma as unknown as PrismaService);

    await expect(adapter.deleteById('user-1')).resolves.toBeUndefined();
  });

  it('rethrows a Prisma error that is not P2025', async () => {
    const fakePrisma = buildFakePrismaService();

    fakePrisma.user.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }),
    );

    const adapter = new PrismaUserAdapter(fakePrisma as unknown as PrismaService);

    await expect(adapter.deleteById('user-1')).rejects.toThrow('Unique constraint failed');
  });

  it('rethrows a non-Prisma error', async () => {
    const fakePrisma = buildFakePrismaService();
    fakePrisma.user.delete.mockRejectedValue(new Error('connection lost'));
    const adapter = new PrismaUserAdapter(fakePrisma as unknown as PrismaService);

    await expect(adapter.deleteById('user-1')).rejects.toThrow('connection lost');
  });
});
