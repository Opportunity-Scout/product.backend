import { TelegramLoginFields } from './TelegramLoginFields';

export interface TelegramLoginPayload extends TelegramLoginFields {
  hash: string;
}
