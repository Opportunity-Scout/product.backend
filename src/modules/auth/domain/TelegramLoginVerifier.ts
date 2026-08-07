import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Result } from '@app/common/kernel/Result';
import { TelegramLoginPayload } from './interfaces/TelegramLoginPayload';
import { InvalidTelegramLoginSignatureError } from './errors/InvalidTelegramLoginSignatureError';
import { ExpiredTelegramLoginError } from './errors/ExpiredTelegramLoginError';

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60; // 24 hours

function buildDataCheckString(fields: Omit<TelegramLoginPayload, 'hash'>): string {
  return Object.keys(fields)
    .filter((key) => fields[key as keyof typeof fields] !== undefined)
    .sort()
    .map((key) => `${key}=${String(fields[key as keyof typeof fields])}`)
    .join('\n');
}

export class TelegramLoginVerifier {
  static verify(
    payload: TelegramLoginPayload,
    botToken: string,
  ): Result<TelegramLoginPayload, InvalidTelegramLoginSignatureError | ExpiredTelegramLoginError> {
    const { hash, ...fields } = payload;
    const dataCheckString = buildDataCheckString(fields);
    const secretKey = createHash('sha256').update(botToken).digest();
    const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    const computedHashBuffer = Buffer.from(computedHash);
    const receivedHashBuffer = Buffer.from(hash);

    const isValidSignature =
      computedHashBuffer.length === receivedHashBuffer.length &&
      timingSafeEqual(computedHashBuffer, receivedHashBuffer);

    if (!isValidSignature) {
      return Result.fail(new InvalidTelegramLoginSignatureError());
    }

    const ageSeconds = Date.now() / 1000 - payload.auth_date;

    if (ageSeconds > MAX_AUTH_AGE_SECONDS || ageSeconds < 0) {
      return Result.fail(new ExpiredTelegramLoginError());
    }

    return Result.ok(payload);
  }
}
