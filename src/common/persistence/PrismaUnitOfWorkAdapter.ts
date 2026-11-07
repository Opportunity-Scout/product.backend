import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@app/common/unitOfWork/UnitOfWork';
import { PrismaService } from './PrismaService';
import { PrismaTransactionContext } from './PrismaTransactionContext';

@Injectable()
export class PrismaUnitOfWorkAdapter implements UnitOfWork {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionContext: PrismaTransactionContext,
  ) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    if (this.transactionContext.isInTransaction()) {
      return work();
    }

    return this.prisma.$transaction((transactionClient) => this.transactionContext.runWith(transactionClient, work));
  }
}
