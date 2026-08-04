import { DomainError } from '@app/common/kernel/DomainError';

export class SearchProfileNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Search profile ${id} not found`);
  }
}
