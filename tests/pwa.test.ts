import { expect, it, vi } from 'vitest';
import { watchForUpdate } from '../src/platform/pwa';

class Worker extends EventTarget {
  constructor(public state: ServiceWorkerState) {
    super();
  }

  changeState(state: ServiceWorkerState) {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

class Registration extends EventTarget {
  active: Worker | null = null;
  installing: Worker | null = null;
  waiting: Worker | null = null;

  watch(notify: () => void) {
    watchForUpdate(this as unknown as ServiceWorkerRegistration, notify);
  }

  install(worker: Worker) {
    this.installing = worker;
    this.dispatchEvent(new Event('updatefound'));
  }
}

it('keeps the first offline installation silent', () => {
  const registration = new Registration();
  const notify = vi.fn();
  registration.watch(notify);
  const worker = new Worker('installing');
  registration.install(worker);
  worker.changeState('installed');
  registration.active = worker;
  worker.changeState('activated');
  expect(notify).not.toHaveBeenCalled();
});

it('announces a completed update once, including one already waiting', () => {
  const registration = new Registration();
  registration.active = new Worker('activated');
  const notify = vi.fn();
  registration.watch(notify);

  const failed = new Worker('installing');
  registration.install(failed);
  failed.changeState('redundant');
  const update = new Worker('installing');
  registration.install(update);
  expect(notify).not.toHaveBeenCalled();
  registration.waiting = update;
  update.changeState('installed');
  registration.dispatchEvent(new Event('updatefound'));
  expect(notify).toHaveBeenCalledOnce();

  const reopened = vi.fn();
  registration.watch(reopened);
  expect(reopened).toHaveBeenCalledOnce();
});
