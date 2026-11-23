import type { ProgressStore } from '../core/progressStore';
import type { GameContent } from '../content/schemas';
import type { DriveInput, Rider, Scheme } from '../gameplay/bicycle';
import {
  Tutorial,
  tutorialCanContinue,
  tutorialUsesBike,
  type TutorialStep,
} from '../gameplay/Tutorial';
import {
  distanceToLine,
  lateralOffset,
  type WorldModel,
} from '../rules/world/WorldModel';
import type { DrivingControls, InputDevice } from '../ui/DrivingControls';
import { GoalArrow } from '../ui/GoalArrow';
import { TutorialPanel, type TutorialFeedback } from '../ui/TutorialPanel';

export class CityTutorial {
  private readonly lesson: Tutorial;
  private readonly panel: TutorialPanel;
  private readonly arrow: GoalArrow;
  private readonly lane;
  readonly target;
  private readonly practiceStart;
  private readonly stopStart;
  private feedback?: TutorialFeedback;
  private shownStep?: TutorialStep;
  private shownDevice?: InputDevice;
  private shownScheme?: Scheme;
  private shownFeedback?: TutorialFeedback;

  constructor(
    step: TutorialStep,
    world: WorldModel,
    private readonly controls: DrivingControls,
    private readonly store: ProgressStore,
    balance: GameContent['balans']['silnik'],
    private readonly resetRider: (
      origin: Pick<Rider, 'x' | 'y' | 'heading'>,
    ) => void,
    private readonly leave: (campaign: boolean) => void,
  ) {
    const lane = (this.lane = world.lanes.find(({ id }) => id === 'stop-N')!);
    const scale = 1 / world.metersPerPixel;
    this.target = {
      x: (lane.end.x - 1.5 * lane.forward.x) * scale,
      y: (lane.end.y - 1.5 * lane.forward.y) * scale,
    };
    this.stopStart = {
      x: (lane.end.x - 5 * lane.forward.x) * scale,
      y: (lane.end.y - 5 * lane.forward.y) * scale,
      heading: Math.atan2(lane.forward.y, lane.forward.x),
    };
    const practiceLane = world.lanes.find(({ id }) => id === 'yield-S')!;
    this.practiceStart = {
      x: (practiceLane.end.x - 17.6 * practiceLane.forward.x) * scale,
      y: (practiceLane.end.y - 17.6 * practiceLane.forward.y) * scale,
      heading: Math.atan2(practiceLane.forward.y, practiceLane.forward.x),
    };
    this.lesson = new Tutorial(step, balance.sygnalizacja_min_przed_s);
    this.arrow = new GoalArrow(controls.root);
    if (step === 'brake') this.feedback = 'resumeBrake';
    this.panel = new TutorialPanel(
      controls.root,
      () => this.continue(),
      () => this.finish(false),
    );
    this.resetRider(this.origin);
    this.refresh();
  }

  get step() {
    return this.lesson.step;
  }

  get canRide() {
    return tutorialUsesBike(this.step);
  }

  get showTarget() {
    return this.step === 'stop' || this.step === 'arrow';
  }

  private get origin() {
    return this.step === 'stop' ? this.stopStart : this.practiceStart;
  }

  refresh() {
    if (
      this.shownStep === this.step &&
      this.shownDevice === this.controls.device &&
      this.shownScheme === this.controls.scheme &&
      this.shownFeedback === this.feedback
    )
      return;
    this.shownStep = this.step;
    this.shownDevice = this.controls.device;
    this.shownScheme = this.controls.scheme;
    this.shownFeedback = this.feedback;
    this.controls.root.dataset.tutorialStep = this.step;
    this.arrow.root.hidden = !this.showTarget;
    this.panel.show(
      this.step,
      this.controls.device,
      this.controls.scheme,
      this.feedback,
    );
  }

  drawArrow(rider: Rider, metersPerPixel: number) {
    if (this.showTarget)
      this.arrow.draw(
        (this.target.x - rider.x) * metersPerPixel,
        (this.target.y - rider.y) * metersPerPixel,
      );
  }

  ride(
    rider: Rider,
    input: DriveInput,
    dt: number,
    collided: boolean,
    rulesPosition: { x: number; y: number },
    stopReady: boolean,
  ) {
    const distance =
      this.step === 'stop'
        ? distanceToLine(this.lane, rulesPosition)
        : undefined;
    const stop =
      distance === undefined
        ? undefined
        : {
            ready: stopReady && rider.speed === 0,
            missed:
              distance < 0 ||
              Math.abs(lateralOffset(this.lane, rulesPosition)) >
                this.lane.width / 2 ||
              distance > 8,
          };
    const offCourse =
      distance === undefined &&
      Math.hypot(rider.x - this.origin.x, rider.y - this.origin.y) > 120;
    const result =
      collided || offCourse
        ? 'retry'
        : this.lesson.ride(
            rider,
            this.origin,
            input,
            this.controls.actions,
            dt,
            stop,
          );
    if (result === 'pass') this.advance();
    else if (result) {
      this.feedback = result;
      if (result !== 'turnNow') {
        this.lesson.resetAttempt();
        this.resetRider(this.origin);
      }
    }
  }

  advance() {
    const previous = this.step;
    const next = this.lesson.advance();
    if (!next) return;
    this.store.change((profile) => {
      if (profile.tutorial === previous) profile.tutorial = next;
    });
    this.feedback = undefined;
    if (next === 'lights') this.controls.setLights(false);
    if (previous !== 'move') this.resetRider(this.origin);
    this.refresh();
    if (tutorialCanContinue(next) && !this.controls.paused)
      this.panel.next.focus();
  }

  focusNext() {
    if (tutorialCanContinue(this.step)) this.panel.next.focus();
  }

  continue() {
    if (!tutorialCanContinue(this.step)) return false;
    if (this.step === 'finish') this.finish(true);
    else this.advance();
    return true;
  }

  private finish(campaign: boolean) {
    const previous = this.step;
    this.store.change((profile) => {
      if (profile.tutorial === previous)
        profile.tutorial = previous === 'finish' ? 'done' : 'skipped';
    });
    this.leave(campaign);
  }

  destroy() {
    this.arrow.destroy();
  }
}
