import { Result } from '@app/common/kernel/Result';
import { SalaryExpectationProps } from './interfaces/SalaryExpectationProps';
import { NegativeSalaryError } from './errors/NegativeSalaryError';

export class SalaryExpectation {
  private constructor(
    private readonly _minimumSalary: number | null,
    private readonly _currency: string | null,
  ) {}

  static create(props: SalaryExpectationProps = {}): Result<SalaryExpectation, NegativeSalaryError> {
    if (props.minimumSalary !== undefined && props.minimumSalary < 0) {
      return Result.fail(new NegativeSalaryError());
    }

    return Result.ok(new SalaryExpectation(props.minimumSalary ?? null, props.currency ?? null));
  }

  get minimumSalary(): number | null {
    return this._minimumSalary;
  }

  get currency(): string | null {
    return this._currency;
  }
}
