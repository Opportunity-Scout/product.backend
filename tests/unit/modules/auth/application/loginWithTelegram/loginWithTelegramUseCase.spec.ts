import { InvalidTelegramLoginSignatureError } from '@app/modules/auth/domain/errors/InvalidTelegramLoginSignatureError';
import { ExpiredTelegramLoginError } from '@app/modules/auth/domain/errors/ExpiredTelegramLoginError';
import {
  buildLoginWithTelegramUseCase,
  LOGIN_WITH_TELEGRAM_BOT_TOKEN,
} from '../../../../helpers/buildLoginWithTelegramUseCaseHelper';
import { signTelegramLoginPayload } from '../../../../../helpers/signTelegramLoginPayloadHelper';

describe('LoginWithTelegramUseCase', () => {
  it('creates a new user and issues a valid token when none exists for the telegram id', async () => {
    const { useCase, userRepository, tokenIssuer } = buildLoginWithTelegramUseCase();

    const payload = signTelegramLoginPayload(
      { id: '12345', username: 'oleg', auth_date: Math.floor(Date.now() / 1000) },
      LOGIN_WITH_TELEGRAM_BOT_TOKEN,
    );

    const result = await useCase.execute(payload);
    const verified = result.isSuccess ? tokenIssuer.verify(result.value) : null;

    expect(result.isSuccess).toBe(true);
    expect(userRepository.saved).toHaveLength(1);
    expect(userRepository.saved[0].telegramUserId).toBe('12345');
    expect(userRepository.saved[0].telegramUsername).toBe('oleg');
    expect(verified?.userId).toBe(userRepository.saved[0].id);
  });

  it('reuses the existing user instead of creating a duplicate', async () => {
    const { useCase, userRepository } = buildLoginWithTelegramUseCase();

    const payload = signTelegramLoginPayload(
      { id: '12345', auth_date: Math.floor(Date.now() / 1000) },
      LOGIN_WITH_TELEGRAM_BOT_TOKEN,
    );

    await useCase.execute(payload);
    await useCase.execute(payload);

    expect(userRepository.saved).toHaveLength(1);
  });

  it('updates the stored username when an existing user logs in with a new one', async () => {
    const { useCase, userRepository } = buildLoginWithTelegramUseCase();

    const firstPayload = signTelegramLoginPayload(
      { id: '12345', username: 'old-username', auth_date: Math.floor(Date.now() / 1000) },
      LOGIN_WITH_TELEGRAM_BOT_TOKEN,
    );

    const secondPayload = signTelegramLoginPayload(
      { id: '12345', username: 'new-username', auth_date: Math.floor(Date.now() / 1000) },
      LOGIN_WITH_TELEGRAM_BOT_TOKEN,
    );

    await useCase.execute(firstPayload);
    await useCase.execute(secondPayload);

    expect(userRepository.saved).toHaveLength(1);
    expect(userRepository.saved[0].telegramUsername).toBe('new-username');
  });

  it('fails with the verifier error when the signature is invalid', async () => {
    const { useCase } = buildLoginWithTelegramUseCase();

    const payload = signTelegramLoginPayload(
      { id: '12345', auth_date: Math.floor(Date.now() / 1000) },
      'a-different-bot-token',
    );

    const result = await useCase.execute(payload);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(InvalidTelegramLoginSignatureError);
  });

  it('fails with the verifier error when the payload is too old', async () => {
    const { useCase, userRepository } = buildLoginWithTelegramUseCase();
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60;
    const payload = signTelegramLoginPayload({ id: '12345', auth_date: twoDaysAgo }, LOGIN_WITH_TELEGRAM_BOT_TOKEN);
    const result = await useCase.execute(payload);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(ExpiredTelegramLoginError);
    expect(userRepository.saved).toHaveLength(0);
  });
});
