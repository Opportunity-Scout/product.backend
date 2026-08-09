import { HealthController } from '@app/common/health/HealthController';

describe('HealthController', () => {
  it('returns an ok status', () => {
    const controller = new HealthController();

    expect(controller.check()).toEqual({ status: 'ok' });
  });
});
