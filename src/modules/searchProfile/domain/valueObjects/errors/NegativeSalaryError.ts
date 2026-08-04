import { DomainError } from '@app/common/kernel/DomainError';

export class NegativeSalaryError extends DomainError {
  constructor() {
    super('Minimum salary cannot be negative');
  }
}
