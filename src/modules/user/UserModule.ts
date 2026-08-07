import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/common/persistence/PrismaModule';
import { USER_REPOSITORY } from './application/ports/UserRepository';
import { PrismaUserAdapter } from './infrastructure/persistence/PrismaUserAdapter';

@Module({
  imports: [PrismaModule],
  providers: [{ provide: USER_REPOSITORY, useClass: PrismaUserAdapter }],
  exports: [USER_REPOSITORY],
})
export class UserModule {}
