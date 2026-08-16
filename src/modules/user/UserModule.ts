import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '@app/common/persistence/PrismaModule';
import { AuthModule } from '@app/modules/auth/AuthModule';
import { SearchProfileModule } from '@app/modules/searchProfile/SearchProfileModule';
import { USER_REPOSITORY } from './application/ports/UserRepository';
import { PrismaUserAdapter } from './infrastructure/persistence/PrismaUserAdapter';
import { UserAccessService } from './application/UserAccessService';
import { SetSearchProfileLimitUseCase } from './application/setSearchProfileLimit/SetSearchProfileLimitUseCase';
import { ListUsersUseCase } from './application/listUsers/ListUsersUseCase';
import { DeleteUserUseCase } from './application/deleteUser/DeleteUserUseCase';
import { UsersController } from './presentation/UsersController';
import { AdminGuard } from './presentation/AdminGuard';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule), forwardRef(() => SearchProfileModule)],
  controllers: [UsersController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserAdapter },
    UserAccessService,
    SetSearchProfileLimitUseCase,
    ListUsersUseCase,
    DeleteUserUseCase,
    AdminGuard,
  ],
  exports: [USER_REPOSITORY, UserAccessService, AdminGuard],
})
export class UserModule {}
