import { Module } from '@nestjs/common';
import { UNIT_OF_WORK } from '@app/common/unitOfWork/UnitOfWork';
import { PrismaService } from './PrismaService';
import { PrismaTransactionContext } from './PrismaTransactionContext';
import { PrismaUnitOfWorkAdapter } from './PrismaUnitOfWorkAdapter';

@Module({
  providers: [PrismaService, PrismaTransactionContext, { provide: UNIT_OF_WORK, useClass: PrismaUnitOfWorkAdapter }],
  exports: [PrismaService, PrismaTransactionContext, UNIT_OF_WORK],
})
export class PrismaModule {}
