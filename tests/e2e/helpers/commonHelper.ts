import { createHash, createHmac } from 'crypto';
import { TelegramLoginFields, TelegramLoginPayload } from '../api/auth/interfaces';

class CommonHelper {
  public signTelegramLoginPayload(fields: TelegramLoginFields, botToken: string): TelegramLoginPayload {
    const dataCheckString = Object.keys(fields)
      .filter((key) => fields[key as keyof TelegramLoginFields] !== undefined)
      .sort()
      .map((key) => `${key}=${String(fields[key as keyof TelegramLoginFields])}`)
      .join('\n');

    const secretKey = createHash('sha256').update(botToken).digest();
    const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return { ...fields, hash };
  }
}

export const commonHelper = new CommonHelper();
