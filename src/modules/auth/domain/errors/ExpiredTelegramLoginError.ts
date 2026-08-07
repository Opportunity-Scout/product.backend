import { DomainError } from '@app/common/kernel/DomainError';

export class ExpiredTelegramLoginError extends DomainError {
  constructor() {
    super('Telegram login payload auth_date is outside the acceptable window');
  }
}
