import { ApplicationLifecycleService } from './application-lifecycle.service';

describe('ApplicationLifecycleService', () => {
  it('enters draining state before application shutdown', () => {
    const service = new ApplicationLifecycleService();

    expect(service.isDraining()).toBe(false);

    service.beforeApplicationShutdown('SIGTERM');

    expect(service.isDraining()).toBe(true);
    expect(service.getShutdownSignal()).toBe('SIGTERM');
  });
});
