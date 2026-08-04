import { DomainError } from '@app/common/kernel/DomainError';

export class LocationRequiresCountryError extends DomainError {
  constructor() {
    super('At least one country is required when remote is false');
  }
}
