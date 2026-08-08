import { DomainError } from '@app/common/kernel/DomainError';

export class SearchProfileLimitExceededError extends DomainError {
  constructor(userId: string, limit: number) {
    super(`Search profile limit (${limit}) reached for user ${userId}`);
  }
}
