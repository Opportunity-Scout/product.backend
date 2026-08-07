import { JwtService } from '@nestjs/jwt';
import { LoginWithTelegramUseCase } from '@app/modules/auth/application/loginWithTelegram/LoginWithTelegramUseCase';
import { JwtTokenIssuerAdapter } from '@app/modules/auth/infrastructure/JwtTokenIssuerAdapter';
import { FakeUserRepository } from './fakeUserRepositoryHelper';

export const LOGIN_WITH_TELEGRAM_BOT_TOKEN = 'test-bot-token';

export function buildLoginWithTelegramUseCase() {
  const userRepository = new FakeUserRepository();
  const tokenIssuer = new JwtTokenIssuerAdapter(new JwtService({ secret: 'test-secret' }));
  const useCase = new LoginWithTelegramUseCase(userRepository, tokenIssuer, LOGIN_WITH_TELEGRAM_BOT_TOKEN);

  return { useCase, userRepository, tokenIssuer };
}
