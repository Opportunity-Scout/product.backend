import { Module } from '@nestjs/common';
import { SearchProfileModule } from './modules/searchProfile/SearchProfileModule';
import { UserModule } from './modules/user/UserModule';
import { AuthModule } from './modules/auth/AuthModule';

@Module({
  imports: [SearchProfileModule, UserModule, AuthModule],
})
export class AppModule {}
