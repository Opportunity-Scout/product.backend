import { createHash, createHmac } from 'crypto';
import validate from 'uuid-validate';
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

  public isValidUuidV4(value: string): boolean {
    return validate(value, 4);
  }

  public randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

export const commonHelper = new CommonHelper();
