import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/common/persistence/PrismaService';
import { PrismaTransactionContext } from '@app/common/persistence/PrismaTransactionContext';

describe('PrismaTransactionContext', () => {
  const prisma = {} as PrismaService;
  const transactionClient = {} as Prisma.TransactionClient;

  it('returns the regular client outside a transaction', () => {
    const context = new PrismaTransactionContext(prisma);

    expect(context.client).toBe(prisma);
    expect(context.isInTransaction()).toBe(false);
  });

  it('returns the transaction client inside runWith, across awaits', async () => {
    const context = new PrismaTransactionContext(prisma);
    const seen = await context.runWith(transactionClient, async () => {
      await Promise.resolve();

      return { client: context.client, inTransaction: context.isInTransaction() };
    });

    expect(seen.client).toBe(transactionClient);
    expect(seen.inTransaction).toBe(true);
  });

  it('falls back to the regular client once runWith has finished', async () => {
    const context = new PrismaTransactionContext(prisma);
    await context.runWith(transactionClient, () => Promise.resolve());

    expect(context.client).toBe(prisma);
    expect(context.isInTransaction()).toBe(false);
  });
});
