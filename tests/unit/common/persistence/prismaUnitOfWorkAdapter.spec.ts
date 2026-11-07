import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/common/persistence/PrismaService';
import { PrismaTransactionContext } from '@app/common/persistence/PrismaTransactionContext';
import { PrismaUnitOfWorkAdapter } from '@app/common/persistence/PrismaUnitOfWorkAdapter';

describe('PrismaUnitOfWorkAdapter', () => {
  const transactionClient = {} as Prisma.TransactionClient;

  function buildAdapter() {
    const $transaction = jest.fn((work: (client: Prisma.TransactionClient) => Promise<unknown>) =>
      work(transactionClient),
    );
    const prisma = { $transaction } as unknown as PrismaService;
    const transactionContext = new PrismaTransactionContext(prisma);

    return { adapter: new PrismaUnitOfWorkAdapter(prisma, transactionContext), transactionContext, $transaction };
  }

  it('opens one transaction and exposes its client to the work', async () => {
    const { adapter, transactionContext, $transaction } = buildAdapter();
    const clientSeenByWork = await adapter.run(() => Promise.resolve(transactionContext.client));

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(clientSeenByWork).toBe(transactionClient);
  });

  it('joins the outer transaction instead of opening a nested one', async () => {
    const { adapter, $transaction } = buildAdapter();
    const result = await adapter.run(() => adapter.run(() => Promise.resolve('inner')));

    expect(result).toBe('inner');
    expect($transaction).toHaveBeenCalledTimes(1);
  });

  it('propagates a failure from the work', async () => {
    const { adapter } = buildAdapter();

    await expect(adapter.run(() => Promise.reject(new Error('work failed')))).rejects.toThrow('work failed');
  });
});
