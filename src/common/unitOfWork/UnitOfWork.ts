export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

export interface UnitOfWork {
  /** Runs `work` in one transaction; rolls back only if it throws — a returned `Result.fail` still commits. */
  run<T>(work: () => Promise<T>): Promise<T>;
}
