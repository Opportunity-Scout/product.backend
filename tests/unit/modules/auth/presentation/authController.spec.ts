import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from '@app/modules/auth/presentation/AuthController';
import {
  buildLoginWithTelegramUseCase,
  LOGIN_WITH_TELEGRAM_BOT_TOKEN,
} from '../../../helpers/buildLoginWithTelegramUseCaseHelper';
import { signTelegramLoginPayload } from '../../../../helpers/signTelegramLoginPayloadHelper';

describe('AuthController', () => {
  it('returns a token for a validly signed payload', async () => {
    const { useCase } = buildLoginWithTelegramUseCase();
    const controller = new AuthController(useCase);

    const payload = signTelegramLoginPayload(
      { id: '12345', auth_date: Math.floor(Date.now() / 1000) },
      LOGIN_WITH_TELEGRAM_BOT_TOKEN,
    );

    const response = await controller.login(payload);

    expect(typeof response.token).toBe('string');
  });

  it('responds with 401 when the signature is invalid', async () => {
    const { useCase } = buildLoginWithTelegramUseCase();
    const controller = new AuthController(useCase);

    const payload = signTelegramLoginPayload(
      { id: '12345', auth_date: Math.floor(Date.now() / 1000) },
      'a-different-bot-token',
    );

    await expect(controller.login(payload)).rejects.toThrow(UnauthorizedException);
  });

  it('responds with 401 when the payload is too old', async () => {
    const { useCase } = buildLoginWithTelegramUseCase();
    const controller = new AuthController(useCase);
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60;
    const payload = signTelegramLoginPayload({ id: '12345', auth_date: twoDaysAgo }, LOGIN_WITH_TELEGRAM_BOT_TOKEN);

    await expect(controller.login(payload)).rejects.toThrow(UnauthorizedException);
  });
});
