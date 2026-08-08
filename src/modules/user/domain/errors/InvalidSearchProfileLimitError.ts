import { DomainError } from '@app/common/kernel/DomainError';

export class InvalidSearchProfileLimitError extends DomainError {
  constructor(limit: number) {
    super(`Search profile limit must be a non-negative integer, got ${limit}`);
  }
}
