import { DomainError } from '@app/common/kernel/DomainError';

export class InvalidTelegramLoginSignatureError extends DomainError {
  constructor() {
    super('Telegram login payload signature is invalid');
  }
}
