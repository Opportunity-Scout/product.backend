import { AsyncLocalStorage } from 'async_hooks';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './PrismaService';

@Injectable()
export class PrismaTransactionContext {
  private readonly storage = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(private readonly prisma: PrismaService) {}

  /** The active transaction's client inside `UnitOfWork.run()`, the regular client otherwise. */
  get client(): Prisma.TransactionClient {
    return this.storage.getStore() ?? this.prisma;
  }

  isInTransaction(): boolean {
    return this.storage.getStore() !== undefined;
  }

  runWith<T>(transactionClient: Prisma.TransactionClient, work: () => Promise<T>): Promise<T> {
    return this.storage.run(transactionClient, work);
  }
}
