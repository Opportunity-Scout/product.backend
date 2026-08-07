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
    expect(call.update.id).toBeUndefined();
    expect(call.update.createdAt).toBeUndefined();
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
      createdAt: now,
    });

    const adapter = new PrismaUserAdapter(fakePrisma as unknown as PrismaService);
    const found = await adapter.findById('existing-id');

    expect(found?.id).toBe('existing-id');
    expect(found?.telegramUserId).toBe('12345');
    expect(found?.telegramUsername).toBe('oleg');
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
      createdAt: now,
    });

    const adapter = new PrismaUserAdapter(fakePrisma as unknown as PrismaService);
    const found = await adapter.findByTelegramUserId('12345');
    const call = fakePrisma.user.findUnique.mock.calls[0][0];

    expect(call.where).toEqual({ telegramUserId: '12345' });
    expect(found?.telegramUserId).toBe('12345');
    expect(found?.telegramUsername).toBeNull();
  });
});
