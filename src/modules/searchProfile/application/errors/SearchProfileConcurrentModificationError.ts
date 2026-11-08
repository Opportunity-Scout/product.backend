import { DomainError } from '@app/common/kernel/DomainError';

export class SearchProfileConcurrentModificationError extends DomainError {
  constructor(id: string) {
    super(`Search profile ${id} was modified by another request`);
  }
}
