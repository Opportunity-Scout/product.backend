import { TelegramLoginVerifier } from '@app/modules/auth/domain/TelegramLoginVerifier';
import { InvalidTelegramLoginSignatureError } from '@app/modules/auth/domain/errors/InvalidTelegramLoginSignatureError';
import { ExpiredTelegramLoginError } from '@app/modules/auth/domain/errors/ExpiredTelegramLoginError';
import { signTelegramLoginPayload } from '../../../../helpers/signTelegramLoginPayloadHelper';

const BOT_TOKEN = 'test-bot-token';

describe('TelegramLoginVerifier', () => {
  it('accepts a correctly signed, fresh payload', () => {
    const payload = signTelegramLoginPayload(
      { id: '12345', first_name: 'Oleg', auth_date: Math.floor(Date.now() / 1000) },
      BOT_TOKEN,
    );

    const result = TelegramLoginVerifier.verify(payload, BOT_TOKEN);

    expect(result.isSuccess).toBe(true);
    expect(result.value.id).toBe('12345');
  });

  it('accepts a payload with only the required fields', () => {
    const payload = signTelegramLoginPayload({ id: '12345', auth_date: Math.floor(Date.now() / 1000) }, BOT_TOKEN);
    const result = TelegramLoginVerifier.verify(payload, BOT_TOKEN);

    expect(result.isSuccess).toBe(true);
  });

  it('rejects a payload signed with a different bot token', () => {
    const payload = signTelegramLoginPayload(
      { id: '12345', auth_date: Math.floor(Date.now() / 1000) },
      'a-different-bot-token',
    );

    const result = TelegramLoginVerifier.verify(payload, BOT_TOKEN);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(InvalidTelegramLoginSignatureError);
  });

  it('rejects a payload with a tampered field', () => {
    const payload = signTelegramLoginPayload({ id: '12345', auth_date: Math.floor(Date.now() / 1000) }, BOT_TOKEN);
    const tamperedPayload = { ...payload, id: '99999' };
    const result = TelegramLoginVerifier.verify(tamperedPayload, BOT_TOKEN);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(InvalidTelegramLoginSignatureError);
  });

  it('rejects a payload with an invalid hash length without throwing', () => {
    const payload = signTelegramLoginPayload({ id: '12345', auth_date: Math.floor(Date.now() / 1000) }, BOT_TOKEN);
    const shortHashPayload = { ...payload, hash: 'too-short' };
    const result = TelegramLoginVerifier.verify(shortHashPayload, BOT_TOKEN);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(InvalidTelegramLoginSignatureError);
  });

  it('rejects a correctly signed payload that is too old', () => {
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60;
    const payload = signTelegramLoginPayload({ id: '12345', auth_date: twoDaysAgo }, BOT_TOKEN);
    const result = TelegramLoginVerifier.verify(payload, BOT_TOKEN);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(ExpiredTelegramLoginError);
  });

  it('rejects a correctly signed payload with an auth_date in the future', () => {
    const oneHourFromNow = Math.floor(Date.now() / 1000) + 60 * 60;
    const payload = signTelegramLoginPayload({ id: '12345', auth_date: oneHourFromNow }, BOT_TOKEN);
    const result = TelegramLoginVerifier.verify(payload, BOT_TOKEN);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(ExpiredTelegramLoginError);
  });
});
