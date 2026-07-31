import { Result } from '@app/common/kernel/Result';

describe('Result', () => {
  it('creates a successful result', () => {
    const result = Result.ok('value');

    expect(result.isSuccess).toBe(true);
    expect(result.isFailure).toBe(false);
    expect(result.value).toBe('value');
  });

  it('creates a failed result', () => {
    const error = new Error('failure');
    const result = Result.fail(error);

    expect(result.isSuccess).toBe(false);
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(error);
  });

  it('throws when reading the value of a failed result', () => {
    const result = Result.fail(new Error('failure'));

    expect(() => result.value).toThrow('Cannot read the value of a failed Result');
  });

  it('throws when reading the error of a successful result', () => {
    const result = Result.ok('value');

    expect(() => result.error).toThrow('Cannot read the error of a successful Result');
  });
});
