import type { DriveInput, Rider, RiderState } from './bicycle';

export const tutorialSteps = [
  'move',
  'brake',
  'look',
  'left',
  'right',
  'bell',
  'lights',
  'walk',
  'stop',
  'points',
  'series',
  'attention',
  'arrow',
  'phone',
  'pause',
  'finish',
] as const;

export type TutorialStep = (typeof tutorialSteps)[number];
export const tutorialStates = [...tutorialSteps, 'skipped', 'done'] as const;

export function isTutorialStep(
  state: (typeof tutorialStates)[number] | undefined,
): state is TutorialStep {
  return state !== undefined && state !== 'skipped' && state !== 'done';
}

export function tutorialUsesBike(step: TutorialStep) {
  return (
    step === 'move' ||
    step === 'brake' ||
    step === 'left' ||
    step === 'right' ||
    step === 'walk' ||
    step === 'stop'
  );
}

export function tutorialCanContinue(step: TutorialStep) {
  return (
    step === 'points' ||
    step === 'series' ||
    step === 'attention' ||
    step === 'arrow' ||
    step === 'finish'
  );
}

export class Tutorial {
  private signaledFor = 0;
  private readyToTurn = false;
  private turnStarted = false;
  private braked = false;
  private moving = false;

  constructor(
    public step: TutorialStep,
    private readonly signalSeconds: number,
  ) {}

  advance() {
    const next = tutorialSteps[tutorialSteps.indexOf(this.step) + 1];
    if (next) {
      const wasMoving = this.step === 'move';
      this.step = next;
      this.resetAttempt();
      this.moving = wasMoving;
    }
    return next;
  }

  resetAttempt() {
    this.signaledFor = 0;
    this.readyToTurn = false;
    this.turnStarted = false;
    this.braked = false;
    this.moving = false;
  }

  ride(
    rider: Rider,
    origin: Pick<Rider, 'x' | 'y' | 'heading'>,
    input: DriveInput,
    actions: RiderState,
    dt: number,
    stop: { ready: boolean; missed: boolean } | undefined,
  ) {
    const distance = Math.hypot(rider.x - origin.x, rider.y - origin.y);
    switch (this.step) {
      case 'move':
        return distance >= 32 ? 'pass' : undefined;
      case 'brake':
        this.moving ||= rider.speed > 8;
        this.braked ||=
          this.moving &&
          (input.brake || (input.scheme === 'classic' && input.y > 0.1));
        return this.braked && rider.speed === 0 ? 'pass' : undefined;
      case 'look':
        return actions.looking ? 'pass' : undefined;
      case 'left':
      case 'right': {
        const delta = rider.heading - origin.heading;
        const angle =
          Math.atan2(Math.sin(delta), Math.cos(delta)) *
          (this.step === 'left' ? -1 : 1);
        if (angle < -0.2 || (!this.readyToTurn && angle > 0.2))
          return 'signalFirst';
        if (this.readyToTurn && !this.turnStarted) {
          if (actions.signal !== this.step) return 'signalFirst';
          this.turnStarted = angle > 0.2;
        }
        if (!this.readyToTurn) {
          this.signaledFor =
            actions.signal === this.step ? this.signaledFor + dt : 0;
          this.readyToTurn = this.signaledFor >= this.signalSeconds;
          if (this.readyToTurn) return 'turnNow';
        }
        return this.readyToTurn && angle >= 0.65 && rider.speed > 8
          ? 'pass'
          : undefined;
      }
      case 'bell':
        return actions.bell ? 'pass' : undefined;
      case 'lights':
        return actions.lights ? 'pass' : undefined;
      case 'walk':
        return rider.walking && distance >= 24 ? 'pass' : undefined;
      case 'stop':
        if (stop?.missed) return 'missedLine';
        return stop?.ready ? 'pass' : undefined;
    }
  }
}
