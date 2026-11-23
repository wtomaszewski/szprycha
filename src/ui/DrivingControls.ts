import type { DriveInput, Scheme, RiderState } from '../gameplay/bicycle';
import { ui } from '../core/presentation';
import { CAMERA_HEIGHT_PX } from '../render/projection';
import type { ProgressStore } from '../core/progressStore';
import {
  accessibilityPreferences,
  ridePreference,
  signalCountdownPreference,
} from './RidePreferences';
import {
  positionTouchActions,
  touchLayoutEditor,
  touchSymbols,
} from './TouchLayout';
import type { TouchAction } from '../core/touchLayout';
import {
  activeDialog,
  cancelDialog,
  connectedGamepad,
  gamepadMenu,
  showGamepadFocus,
} from './KeyboardGamepad';
import { audioSettings } from './AudioControls';
export type InputDevice = 'keyboard' | 'touch' | 'gamepad';

interface OverlayControls {
  keyboard(event: KeyboardEvent): boolean;
  gamepad(
    pressed: (button: number) => boolean,
    justPressed: (button: number) => boolean,
  ): boolean;
}

export class DrivingControls {
  readonly root = document.createElement('main');
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
  previewNight = false;
  onResume?: () => void;
  onPauseOpened?: () => void;
  device: InputDevice = matchMedia('(pointer: coarse)').matches
    ? 'touch'
    : 'keyboard';
  private readonly preferences = document.createElement('details');
  private readonly soundOptions = document.createElement('details');
  private readonly layoutEditor: HTMLDialogElement;
  private readonly pauseMenu = document.createElement('dialog');
  readonly quickActions = document.createElement('div');
  readonly details = document.createElement('div');
  readonly progressDetails = document.createElement('p');
  private x = 0;
  private y = 0;
  private readonly touchKeys = new Set<string>();
  private pointerButton?: HTMLButtonElement;
  private padButtons: boolean[] = [];
  private abort = new AbortController();
  readonly speed = document.createElement('output');
  readonly mode = document.createElement('span');
  readonly notice = document.createElement('p');
  private readonly pauseButton: HTMLButtonElement;
  private readonly lightButton: HTMLButtonElement;
  private readonly plac: boolean;
  private toggleLabel!: HTMLButtonElement;
  constructor(
    areaTitle: string,
    private readonly visuals: { lite: boolean; rain: boolean },
    private toggle: () => void,
    reset: (() => void) | undefined,
    menu: () => void,
    private readonly onPause: () => void,
    setCameraHeight: (height: number) => void,
    setDebugVisible: (visible: boolean) => void,
    private readonly overlays: OverlayControls,
    private readonly progress: ProgressStore,
    private readonly area: 'ride' | 'exam' | 'plac' = 'ride',
  ) {
    const plac = (this.plac = area === 'plac');
    const signal = this.abort.signal;
    const pad = connectedGamepad();
    this.padButtons = pad?.buttons.map((button) => button.pressed) ?? [];
    this.root.className = plac ? 'driving-ui driving-plac' : 'driving-ui';
    this.root.setAttribute('aria-label', ui.driving.controls);
    const { quickActions, pauseMenu } = this;
    quickActions.className = 'ride-quick-actions';
    pauseMenu.className = 'game-dialog ride-pause';
    pauseMenu.setAttribute('aria-labelledby', 'ride-pause-title');
    const heading = document.createElement('h2');
    heading.id = 'ride-pause-title';
    heading.textContent = ui.driving.paused;
    const options = document.createElement('div');
    options.className = 'ride-pause-options';
    const title = document.createElement('p');
    title.textContent = areaTitle;
    this.speed.setAttribute('aria-label', ui.driving.speed);
    this.speed.setAttribute('aria-live', 'off');
    const button = (
      text: string,
      action: () => void,
      parent: HTMLElement = options,
    ) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.addEventListener('click', action, { signal });
      parent.append(b);
      return b;
    };
    this.details.className = 'ride-details';
    this.details.append(this.speed, this.mode);
    this.pauseButton = button('', () => this.togglePause(), quickActions);
    this.pauseButton.setAttribute('aria-label', ui.driving.pause);
    this.pauseButton.setAttribute('aria-haspopup', 'dialog');
    this.pauseButton.setAttribute('aria-keyshortcuts', 'Escape');
    this.pauseButton.className = 'ride-pause-icon';
    const resume = button(ui.driving.resume, () => this.togglePause());
    resume.autofocus = true;

    const scheme = button(ui.driving.classic, () => {
      this.scheme = this.scheme === 'simple' ? 'classic' : 'simple';
      scheme.textContent = ui.driving[this.scheme];
      this.clear();
    });
    scheme.textContent = ui.driving[this.scheme];
    const applyQuality = () => {
      this.root.toggleAttribute('data-lite', this.lite);
      lite.textContent = this.lite ? ui.driving.lite : ui.driving.full;
    };
    const lite = button('', () => {
      this.visuals.lite = !this.lite;
      applyQuality();
    });
    applyQuality();
    const rain = button(ui.driving.rain, () => {
      this.visuals.rain = !this.rain;
      rain.setAttribute('aria-pressed', String(this.rain));
    });
    rain.setAttribute('aria-pressed', String(this.rain));
    if (plac) {
      rain.hidden = true;
      lite.hidden = true;
    }
    if (reset)
      button(ui.driving.reset, () => {
        this.togglePause();
        reset();
      });
    button(plac ? ui.plac.return : ui.driving.menu, () => {
      if (plac) pauseMenu.close();
      menu();
    });
    const help = document.createElement('p');
    help.className = 'drive-help';
    help.textContent = plac ? ui.plac.help : ui.driving.help;
    this.notice.className = 'drive-notice';
    this.notice.setAttribute('role', 'status');
    if (!plac) help.append(' · ', ui.phone.controls);
    pauseMenu.append(
      heading,
      title,
      this.progressDetails,
      options,
      this.soundOptions,
      help,
    );
    pauseMenu.insertBefore(this.preferences, this.soundOptions);
    const touch = document.createElement('div');
    touch.className = 'touch-controls';
    const stick = document.createElement('div');
    stick.className = 'joystick';
    const thumb = document.createElement('span');
    thumb.textContent = '✥';
    stick.append(thumb);
    stick.setAttribute('aria-label', ui.driving.joystick);
    let pointer: number | undefined;
    let anchorX = 0;
    let anchorY = 0;
    let throwDistance = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      this.x = Math.max(-1, Math.min(1, (e.clientX - anchorX) / throwDistance));
      this.y = Math.max(-1, Math.min(1, (e.clientY - anchorY) / throwDistance));
      thumb.style.translate = `${this.x * throwDistance}px ${this.y * throwDistance}px`;
    };
    stick.addEventListener(
      'pointerdown',
      (e) => {
        if (pointer !== undefined || e.button !== 0) return;
        pointer = e.pointerId;
        anchorX = e.clientX;
        anchorY = e.clientY;
        throwDistance = stick.clientWidth / 3;
        stick.setPointerCapture(pointer);
      },
      { signal },
    );
    stick.addEventListener('pointermove', move, { signal });
    stick.addEventListener(
      'lostpointercapture',
      (e) => {
        if (pointer !== e.pointerId) return;
        pointer = undefined;
        thumb.style.removeProperty('translate');
        this.x = 0;
        this.y = 0;
      },
      { signal },
    );

    const actions = document.createElement('div');
    actions.className = 'touch-actions';
    actions.append(stick);
    touch.append(actions);
    const buttons = new Map<TouchAction, HTMLButtonElement>();
    const actionButton = (
      id: TouchAction,
      label: string,
      action: () => void,
    ) => {
      const b = button(touchSymbols[id], action, actions);
      b.setAttribute('aria-label', label);
      b.title = label;
      buttons.set(id, b);
      return b;
    };
    const hold = (id: TouchAction, label: string, code: string) => {
      const b = actionButton(id, label, () => {});
      let heldBy: number | undefined;
      b.addEventListener(
        'pointerdown',
        (e) => {
          if (heldBy !== undefined || e.button !== 0) return;
          heldBy = e.pointerId;
          b.setPointerCapture(e.pointerId);
          this.touchKeys.add(code);
        },
        { signal },
      );
      b.addEventListener(
        'lostpointercapture',
        (e) => {
          if (e.pointerId !== heldBy) return;
          heldBy = undefined;
          this.touchKeys.delete(code);
        },
        { signal },
      );
      return b;
    };
    hold('left', ui.driving.signalLeft, 'KeyQ');
    hold('right', ui.driving.signalRight, 'KeyE');
    hold('look', ui.driving.look, 'KeyC');
    if (!plac) hold('bell', ui.driving.bell, 'KeyF');
    const lights = (this.lightButton = actionButton(
      'lights',
      ui.driving.lights,
      () => this.setLights(!this.actions.lights),
    ));
    this.setLights(false);
    this.toggleLabel = actionButton('dismount', ui.driving.dismount, () =>
      toggle(),
    );
    if (plac) {
      lights.hidden = true;
      this.toggleLabel.hidden = true;
    }
    hold('brake', ui.driving.brake, 'Space').classList.add('brake');
    const applyLayout = () => positionTouchActions(progress, buttons, plac);
    applyLayout();
    const editor = touchLayoutEditor(progress, applyLayout);
    this.layoutEditor = editor.dialog;
    options.append(editor.open);
    const projection = document.createElement('div');
    projection.className = 'projection-debug';
    projection.hidden = true;
    const cameraHeight = document.createElement('input');
    const cameraLabel = document.createElement('label');
    cameraLabel.textContent = ui.driving.cameraHeight;
    cameraHeight.id = 'drive-camera-height';
    cameraLabel.htmlFor = cameraHeight.id;
    cameraHeight.type = 'range';
    cameraHeight.min = '400';
    cameraHeight.max = '2400';
    cameraHeight.step = '10';
    cameraHeight.value = String(CAMERA_HEIGHT_PX);
    const heightValue = document.createElement('span');
    const updateCameraHeight = () => {
      heightValue.textContent = `${cameraHeight.value} px`;
      setCameraHeight(cameraHeight.valueAsNumber);
    };
    heightValue.textContent = `${cameraHeight.value} px`;
    cameraHeight.addEventListener('input', updateCameraHeight, { signal });
    projection.append(cameraLabel, cameraHeight, heightValue);
    const previewNight = button(
      ui.driving.previewNight,
      () => {
        this.previewNight = !this.previewNight;
        previewNight.setAttribute('aria-pressed', String(this.previewNight));
      },
      projection,
    );
    previewNight.setAttribute('aria-pressed', 'false');
    this.root.append(
      this.details,
      quickActions,
      this.notice,
      touch,
      projection,
      pauseMenu,
      editor.dialog,
    );
    document.body.append(this.root);
    this.root.addEventListener(
      'pointerdown',
      (event) => {
        if (event.pointerType === 'touch') this.device = 'touch';
        this.pointerButton =
          event.target instanceof Element
            ? (event.target.closest('button') ?? undefined)
            : undefined;
      },
      { signal, capture: true },
    );
    this.root.addEventListener(
      'focusin',
      (event) => {
        if (event.target !== this.pointerButton) this.pointerButton = undefined;
      },
      { signal },
    );
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.defaultPrevented || this.layoutEditor.open) return;
        if (!e.ctrlKey && !e.metaKey && !e.altKey) this.device = 'keyboard';
        if (this.paused) {
          if (e.code === 'Escape' && !e.repeat) {
            e.preventDefault();
            this.togglePause();
          }
          return;
        }
        if (this.overlays.keyboard(e)) return;
        if (e.code === 'Escape') {
          e.preventDefault();
          if (!e.repeat) this.togglePause();
          return;
        }
        if (!plac && e.code === 'F3') {
          e.preventDefault();
          if (!e.repeat) {
            const visible = projection.hasAttribute('hidden');
            projection.hidden = !visible;
            setDebugVisible(visible);
          }
          return;
        }
        if (e.target instanceof Element && e.target.matches('select,input'))
          return;
        if (
          e.target instanceof Element &&
          e.target.matches('button, summary, a[href]') &&
          (e.code === 'Enter' ||
            (e.code === 'Space' && e.target !== this.pointerButton))
        )
          return;
        if (
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
            e.code,
          )
        )
          e.preventDefault();
        if (
          /^(Arrow(Up|Down|Left|Right)|Key[WASD])$/.test(e.code) &&
          e.target instanceof HTMLButtonElement &&
          this.root.contains(e.target)
        )
          e.target.blur();
        if (e.code === 'Tab') this.pointerButton = undefined;
        this.keys.add(e.code);
        if (e.repeat) return;
        if (!plac && e.code === 'KeyL') lights.click();
        if (e.code === 'KeyX') toggle();
        if (e.code === 'KeyR') reset?.();
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
        if (!this.paused && !document.querySelector('dialog[open]'))
          this.togglePause(false);
      },
      { signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) {
          this.clear();
          if (!this.paused && !document.querySelector('dialog[open]'))
            this.togglePause(false);
        }
      },
      { signal },
    );
  }
  get lite() {
    return this.visuals.lite;
  }

  get rain() {
    return this.visuals.rain;
  }

  get paused() {
    return this.pauseMenu.open;
  }

  focus() {
    this.pauseButton.focus();
  }

  private togglePause(explicit = true) {
    this.clear();
    if (this.paused) {
      this.pauseMenu.close();
      this.pauseButton.focus();
      this.onResume?.();
    } else {
      const preferenceTitle = document.createElement('summary');
      preferenceTitle.textContent = ui.settings.accessibility;
      this.preferences.open = false;
      this.preferences.replaceChildren(
        preferenceTitle,
        ...accessibilityPreferences(this.progress),
      );
      if (!this.plac)
        this.preferences.append(
          ridePreference(this.progress, 'reflectiveVest'),
          signalCountdownPreference(this.progress, this.area === 'exam'),
        );
      const summary = document.createElement('summary');
      summary.textContent = ui.audio.settings;
      this.soundOptions.open = false;
      this.soundOptions.replaceChildren(summary, audioSettings(this.progress));
      this.pauseMenu.showModal();
      this.onPause();
      if (explicit) this.onPauseOpened?.();
    }
  }

  setLights(on: boolean) {
    this.actions.lights = on;
    this.lightButton.setAttribute('aria-pressed', String(on));
  }

  clear() {
    this.keys.clear();
    this.x = 0;
    this.y = 0;
    this.touchKeys.clear();
  }
  read(): DriveInput {
    const pad = connectedGamepad();
    const pressed = (button: number) => Boolean(pad?.buttons[button]?.pressed);
    const previous = this.padButtons;
    this.padButtons = pad?.buttons.map((button) => button.pressed) ?? [];
    const justPressed = (button: number) =>
      pressed(button) && !previous[button];
    if (
      pad &&
      (Math.abs(pad.axes[0] ?? 0) > 0.15 ||
        Math.abs(pad.axes[1] ?? 0) > 0.15 ||
        pad.buttons.some((_, index) => justPressed(index)))
    )
      this.device = 'gamepad';
    if (justPressed(8) || justPressed(9)) showGamepadFocus();
    if (this.paused) {
      if (this.layoutEditor.open) {
        if (justPressed(1)) cancelDialog(this.layoutEditor);
        else gamepadMenu(this.layoutEditor, justPressed);
      } else if (justPressed(9) || justPressed(1)) this.togglePause();
      else gamepadMenu(this.pauseMenu, justPressed);
      return { x: 0, y: 0, brake: false, scheme: this.scheme };
    }
    if (this.overlays.gamepad(pressed, justPressed))
      return { x: 0, y: 0, brake: false, scheme: this.scheme };
    const dialog = this.plac ? activeDialog() : undefined;
    if (dialog) {
      if (justPressed(1)) cancelDialog(dialog);
      else gamepadMenu(dialog, justPressed);
      return { x: 0, y: 0, brake: false, scheme: this.scheme };
    }
    const has = (...codes: string[]) =>
      codes.some((c) => this.keys.has(c) || this.touchKeys.has(c));
    let x =
      this.x ||
      Number(has('KeyD', 'ArrowRight')) - Number(has('KeyA', 'ArrowLeft'));
    let y =
      this.y ||
      Number(has('KeyS', 'ArrowDown')) - Number(has('KeyW', 'ArrowUp'));
    let brake = has('Space');
    let brakePressure = brake ? 1 : 0;
    this.actions.signal = has('KeyQ') ? 'left' : has('KeyE') ? 'right' : null;
    this.actions.looking = has('KeyC');
    this.actions.bell = !this.plac && has('KeyF');
    if (pad) {
      if (Math.abs(pad.axes[0] ?? 0) > 0.15) x = pad.axes[0]!;
      if (Math.abs(pad.axes[1] ?? 0) > 0.15) y = pad.axes[1]!;
      // The yard reads analog pressure for progressive braking.
      brakePressure = Math.max(
        brakePressure,
        pad.buttons[1]?.value ?? 0,
        pad.buttons[7]?.value ?? 0,
      );
      brake ||= !!pad.buttons[1]?.pressed || !!pad.buttons[7]?.pressed;
      if (this.plac) brake ||= brakePressure > 0.05;
      if (justPressed(0)) this.toggle();
      if (justPressed(9)) {
        this.togglePause();
      }
      if (pad.buttons[4]?.pressed) this.actions.signal = 'left';
      if (pad.buttons[5]?.pressed) this.actions.signal = 'right';
      this.actions.looking ||= !!pad.buttons[3]?.pressed;
      this.actions.bell ||= !this.plac && !!pad.buttons[2]?.pressed;
      if (!this.plac && justPressed(12)) this.setLights(!this.actions.lights);
    }
    if (this.plac && this.scheme === 'classic' && y > 0.1)
      brakePressure = Math.max(brakePressure, y);
    return { x, y, brake, scheme: this.scheme, brakePressure };
  }
  setWalking(walking: boolean) {
    this.mode.textContent = walking ? ui.driving.walking : ui.driving.riding;
    const label = walking ? ui.driving.mount : ui.driving.dismount;
    this.toggleLabel.title = label;
    this.toggleLabel.setAttribute('aria-label', label);
  }
  destroy() {
    this.abort.abort();
    this.root.remove();
  }
}
