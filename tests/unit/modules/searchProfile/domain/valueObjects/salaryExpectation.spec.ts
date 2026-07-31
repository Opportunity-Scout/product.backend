import { SalaryExpectation } from '@app/modules/searchProfile/domain/valueObjects/SalaryExpectation';

describe('SalaryExpectation', () => {
  it('defaults to null minimumSalary and currency when no props are given', () => {
    const result = SalaryExpectation.create();

    expect(result.isSuccess).toBe(true);
    expect(result.value.minimumSalary).toBeNull();
    expect(result.value.currency).toBeNull();
  });

  it('keeps the provided minimumSalary and currency', () => {
    const result = SalaryExpectation.create({ minimumSalary: 3000, currency: 'EUR' });

    expect(result.isSuccess).toBe(true);
    expect(result.value.minimumSalary).toBe(3000);
    expect(result.value.currency).toBe('EUR');
  });

  it('accepts a minimumSalary of exactly 0', () => {
    const result = SalaryExpectation.create({ minimumSalary: 0 });

    expect(result.isSuccess).toBe(true);
    expect(result.value.minimumSalary).toBe(0);
  });

  it('rejects a negative minimumSalary', () => {
    const result = SalaryExpectation.create({ minimumSalary: -1 });

    expect(result.isFailure).toBe(true);
  });
});
