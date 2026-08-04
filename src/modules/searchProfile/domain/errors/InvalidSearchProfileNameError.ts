import { DomainError } from '@app/common/kernel/DomainError';

export class InvalidSearchProfileNameError extends DomainError {
  constructor() {
    super('Search profile name must not be empty');
  }
}
