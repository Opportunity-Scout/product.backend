import { DomainError } from '@app/common/kernel/DomainError';
import { SearchProfileStatus } from '../types/SearchProfileStatus';

export class InvalidSearchProfileStatusTransitionError extends DomainError {
  constructor(from: SearchProfileStatus, to: SearchProfileStatus) {
    super(`Cannot transition search profile from "${from}" to "${to}"`);
  }
}
