import type { DriveInput, Scheme, RiderState } from '../gameplay/bicycle';
import { ui } from '../core/presentation';
export class DrivingControls {
  readonly root = document.createElement('section');
  readonly keys = new Set<string>();
  scheme: Scheme = matchMedia('(pointer: coarse)').matches
    ? 'simple'
    : 'classic';
  readonly actions: RiderState = {
    signal: null,
    looking: false,
    bell: false,
    lights: false,
  };
  lite = false;
  paused = false;
  private x = 0;
  private y = 0;
  private braking = false;
  private padButtons: boolean[] = [];
  private abort = new AbortController();
  readonly speed = document.createElement('output');
  readonly mode = document.createElement('span');
  readonly notice = document.createElement('p');
  private pauseButton!: HTMLButtonElement;
  private toggleLabel!: HTMLButtonElement;
  constructor(
    private toggle: () => void,
    reset: () => void,
    menu: () => void,
  ) {
    const signal = this.abort.signal;
    this.root.className = 'driving-ui';
    this.root.setAttribute('aria-label', ui.driving.controls);
    const bar = document.createElement('div');
    bar.className = 'drive-bar';
    const title = document.createElement('strong');
    title.textContent = ui.driving.title;
    this.speed.setAttribute('aria-label', ui.driving.speed);
    const button = (
      text: string,
      action: () => void,
      parent: HTMLElement = bar,
    ) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.addEventListener('click', action, { signal });
      parent.append(b);
      return b;
    };
    bar.append(title, this.speed, this.mode);

    const scheme = button(ui.driving.classic, () => {
      this.scheme = this.scheme === 'simple' ? 'classic' : 'simple';
      scheme.textContent = ui.driving[this.scheme];
      this.clear();
    });
    scheme.textContent = ui.driving[this.scheme];
    const pause = button(ui.driving.pause, () => {
      this.paused = !this.paused;
      pause.textContent = this.paused ? ui.driving.resume : ui.driving.pause;
      this.clear();
    });
    this.pauseButton = pause;
    const lite = button(ui.driving.full, () => {
      this.lite = !this.lite;
      lite.textContent = this.lite ? ui.driving.lite : ui.driving.full;
    });
    button(ui.driving.reset, reset);
    button(ui.driving.menu, menu);
    const help = document.createElement('p');
    help.className = 'drive-help';
    help.textContent = ui.driving.help;
    this.notice.className = 'drive-notice';
    this.notice.setAttribute('role', 'status');
    this.notice.textContent = ui.driving.prototype;
    const touch = document.createElement('div');
    touch.className = 'touch-controls';
    const stick = document.createElement('div');
    stick.className = 'joystick';
    stick.textContent = '✥';
    stick.setAttribute('aria-label', ui.driving.joystick);
    let pointer: number | null = null;
    const move = (e: PointerEvent) => {
      const r = stick.getBoundingClientRect();
      this.x = Math.max(
        -1,
        Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width / 2)),
      );
      this.y = Math.max(
        -1,
        Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height / 2)),
      );
    };
    stick.addEventListener(
      'pointerdown',
      (e) => {
        pointer = e.pointerId;
        stick.setPointerCapture(pointer);
        move(e);
      },
      { signal },
    );
    stick.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerId === pointer) move(e);
      },
      { signal },
    );
    const release = () => {
      pointer = null;
      this.x = 0;
      this.y = 0;
    };
    stick.addEventListener('lostpointercapture', release, { signal });
    stick.addEventListener('pointerup', release, { signal });
    stick.addEventListener('pointercancel', release, { signal });
    touch.append(stick);
    const actions = document.createElement('div');
    actions.className = 'touch-actions';
    touch.append(actions);
    const hold = (label: string, code: string) => {
      const b = button(label, () => {}, actions);
      b.addEventListener(
        'pointerdown',
        (e) => {
          b.setPointerCapture(e.pointerId);
          this.keys.add(code);
        },
        { signal },
      );
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
        b.addEventListener(event, () => this.keys.delete(code), { signal });
    };
    hold(ui.driving.signalLeft, 'KeyQ');
    hold(ui.driving.signalRight, 'KeyE');
    hold(ui.driving.look, 'KeyC');
    hold(ui.driving.bell, 'KeyF');
    const lights = button(
      ui.driving.lights,
      () => {
        this.actions.lights = !this.actions.lights;
        lights.setAttribute('aria-pressed', String(this.actions.lights));
      },
      actions,
    );
    this.toggleLabel = button(ui.driving.dismount, () => toggle(), actions);
    const brake = button(ui.driving.brake, () => {}, actions);
    brake.className = 'brake';
    brake.addEventListener(
      'pointerdown',
      (e) => {
        brake.setPointerCapture(e.pointerId);
        this.braking = true;
      },
      { signal },
    );
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
      brake.addEventListener(
        event,
        () => {
          this.braking = false;
        },
        { signal },
      );
    this.root.append(bar, help, this.notice, touch);
    document.body.append(this.root);
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.target instanceof Element && e.target.matches('select,input'))
          return;
        if (
          e.target instanceof Element &&
          e.target.matches('button') &&
          e.code === 'Enter'
        )
          return;
        if (
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
            e.code,
          )
        )
          e.preventDefault();
        this.keys.add(e.code);
        if (e.repeat) return;
        if (e.code === 'KeyL') lights.click();
        if (e.code === 'KeyX') toggle();
        if (e.code === 'Escape') pause.click();
        if (e.code === 'KeyR') reset();
      },
      { signal },
    );
    window.addEventListener('keyup', (e) => this.keys.delete(e.code), {
      signal,
    });
    window.addEventListener(
      'blur',
      () => {
        this.clear();
        if (!this.paused) pause.click();
      },
      { signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) {
          this.clear();
          if (!this.paused) pause.click();
        }
      },
      { signal },
    );
  }
  clear() {
    this.keys.clear();
    this.x = 0;
    this.y = 0;
    this.braking = false;
  }
  read(): DriveInput {
    const has = (...codes: string[]) => codes.some((c) => this.keys.has(c));
    let x =
      this.x ||
      Number(has('KeyD', 'ArrowRight')) - Number(has('KeyA', 'ArrowLeft'));
    let y =
      this.y ||
      Number(has('KeyS', 'ArrowDown')) - Number(has('KeyW', 'ArrowUp'));
    let brake = this.braking || has('Space');
    const pad = navigator.getGamepads?.().find((p) => p?.connected);
    this.actions.signal = has('KeyQ') ? 'left' : has('KeyE') ? 'right' : null;
    this.actions.looking = has('KeyC');
    this.actions.bell = has('KeyF');
    if (pad) {
      if (Math.abs(pad.axes[0] ?? 0) > 0.15) x = pad.axes[0]!;
      if (Math.abs(pad.axes[1] ?? 0) > 0.15) y = pad.axes[1]!;
      brake ||= !!pad.buttons[1]?.pressed || !!pad.buttons[7]?.pressed;
      if (pad.buttons[0]?.pressed && !this.padButtons[0]) this.toggle();
      if (pad.buttons[9]?.pressed && !this.padButtons[9]) {
        this.pauseButton.click();
      }
      if (pad.buttons[4]?.pressed) this.actions.signal = 'left';
      if (pad.buttons[5]?.pressed) this.actions.signal = 'right';
      this.actions.looking ||= !!pad.buttons[3]?.pressed;
      this.actions.bell ||= !!pad.buttons[2]?.pressed;
      if (pad.buttons[12]?.pressed && !this.padButtons[12])
        this.actions.lights = !this.actions.lights;
      this.padButtons = pad.buttons.map((b) => b.pressed);
    } else this.padButtons = [];
    return { x, y, brake, scheme: this.scheme };
  }
  setWalking(walking: boolean) {
    this.mode.textContent = walking ? ui.driving.walking : ui.driving.riding;
    this.toggleLabel.textContent = walking
      ? ui.driving.mount
      : ui.driving.dismount;
  }
  destroy() {
    this.abort.abort();
    this.root.remove();
  }
}
