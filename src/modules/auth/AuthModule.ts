import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '@app/modules/user/UserModule';
import { USER_REPOSITORY, UserRepository } from '@app/modules/user/application/ports/UserRepository';
import { TOKEN_ISSUER, TokenIssuer } from './application/ports/TokenIssuer';
import { JwtTokenIssuerAdapter } from './infrastructure/JwtTokenIssuerAdapter';
import { LoginWithTelegramUseCase } from './application/loginWithTelegram/LoginWithTelegramUseCase';
import { AuthController } from './presentation/AuthController';
import { JwtAuthGuard } from './presentation/JwtAuthGuard';

@Module({
  controllers: [AuthController],
  imports: [
    forwardRef(() => UserModule),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;

        if (!secret) {
          throw new Error('JWT_SECRET environment variable is required');
        }

        return { secret, signOptions: { expiresIn: '30d' } };
      },
    }),
  ],
  providers: [
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuerAdapter },
    JwtAuthGuard,
    {
      provide: LoginWithTelegramUseCase,
      useFactory: (userRepository: UserRepository, tokenIssuer: TokenIssuer) => {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;

        if (!botToken) {
          throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
        }

        return new LoginWithTelegramUseCase(userRepository, tokenIssuer, botToken);
      },
      inject: [USER_REPOSITORY, TOKEN_ISSUER],
    },
  ],
  exports: [TOKEN_ISSUER, JwtAuthGuard],
})
export class AuthModule {}
