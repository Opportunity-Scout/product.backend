import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '@app/common/persistence/PrismaModule';
import { AuthModule } from '@app/modules/auth/AuthModule';
import { USER_REPOSITORY } from './application/ports/UserRepository';
import { PrismaUserAdapter } from './infrastructure/persistence/PrismaUserAdapter';
import { SetSearchProfileLimitUseCase } from './application/setSearchProfileLimit/SetSearchProfileLimitUseCase';
import { UsersController } from './presentation/UsersController';
import { AdminGuard } from './presentation/AdminGuard';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [{ provide: USER_REPOSITORY, useClass: PrismaUserAdapter }, SetSearchProfileLimitUseCase, AdminGuard],
  exports: [USER_REPOSITORY],
})
export class UserModule {}
