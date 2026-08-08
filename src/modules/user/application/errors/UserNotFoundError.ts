import { DomainError } from '@app/common/kernel/DomainError';

export class UserNotFoundError extends DomainError {
  constructor(id: string) {
    super(`User ${id} not found`);
  }
}
