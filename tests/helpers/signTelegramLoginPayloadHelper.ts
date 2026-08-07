import { createHash, createHmac } from 'crypto';
import { TelegramLoginPayload } from '@app/modules/auth/domain/interfaces/TelegramLoginPayload';

export function signTelegramLoginPayload(
  fields: Omit<TelegramLoginPayload, 'hash'>,
  botToken: string,
): TelegramLoginPayload {
  const dataCheckString = Object.keys(fields)
    .filter((key) => fields[key as keyof typeof fields] !== undefined)
    .sort()
    .map((key) => `${key}=${String(fields[key as keyof typeof fields])}`)
    .join('\n');

  const secretKey = createHash('sha256').update(botToken).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return { ...fields, hash };
}
