import { UnitOfWork } from '@app/common/unitOfWork/UnitOfWork';

export class FakeUnitOfWork implements UnitOfWork {
  runCount = 0;

  run<T>(work: () => Promise<T>): Promise<T> {
    this.runCount++;

    return work();
  }
}
