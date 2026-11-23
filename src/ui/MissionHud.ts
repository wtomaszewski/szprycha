import { GoalArrow } from './GoalArrow';
import { missionClock, translate, ui } from '../core/presentation';
import type { MissionSystem } from '../gameplay/MissionSystem';
import type { OrderText } from '../gameplay/procedural/orders';
import type { Vec2 } from '../rules/types';

function setText(element: HTMLElement, text: string) {
  if (element.textContent !== text) element.textContent = text;
}

function setHidden(element: HTMLElement, hidden: boolean) {
  if (element.hidden !== hidden) element.hidden = hidden;
}

export class MissionHud {
  private readonly title = document.createElement('strong');
  private readonly instruction = document.createElement('p');
  private readonly timer = document.createElement('output');
  private readonly arrow: GoalArrow;
  private readonly equip = document.createElement('button');
  private readonly parcel = document.createElement('label');
  private readonly shocks = document.createElement('progress');
  private readonly photo = document.createElement('button');
  private readonly lights = document.createElement('button');
  private readonly vest = document.createElement('button');
  private readonly resume = document.createElement('button');
  private displayedTitle?: string;
  private displayedSeconds?: number;

  constructor(
    parent: HTMLElement,
    timerSlot: HTMLElement,
    equipHelmet: () => void,
    turnOnLights: () => void,
    equipVest: () => void,
    resumeFromCheckpoint: () => void,
    photograph: () => void,
    private readonly orderText?: OrderText,
  ) {
    const panel = document.createElement('section');
    panel.className = 'mission-panel';
    this.instruction.setAttribute('role', 'status');
    this.parcel.className = 'mission-parcel';
    this.shocks.max = 1;
    this.shocks.value = 0;
    this.parcel.append(ui.missionUi.shocks, this.shocks);
    this.photo.type = 'button';
    this.photo.textContent = ui.missionUi.photograph;
    this.photo.addEventListener('click', photograph);
    panel.append(
      this.title,
      this.instruction,
      this.equip,
      this.lights,
      this.vest,
      this.resume,
      this.parcel,
      this.photo,
    );

    this.timer.className = 'mission-timer';
    this.timer.setAttribute('aria-label', ui.missionUi.timer);
    this.timer.setAttribute('aria-live', 'off');

    this.vest.type =
      this.equip.type =
      this.lights.type =
      this.resume.type =
        'button';
    this.vest.textContent = ui.missionUi.equipVest;
    this.vest.addEventListener('click', equipVest);
    this.lights.textContent = ui.missionUi.turnOnLights;
    this.lights.addEventListener('click', turnOnLights);
    this.equip.textContent = ui.missionUi.equip;
    this.resume.textContent = ui.missionUi.continue;
    this.equip.addEventListener('click', equipHelmet);
    this.resume.addEventListener('click', resumeFromCheckpoint);

    timerSlot.append(this.timer);
    parent.append(panel);
    this.arrow = new GoalArrow(parent);
  }

  destroy() {
    this.arrow.destroy();
  }

  focusEquipment() {
    if (!this.equip.hidden) this.equip.focus();
    else if (!this.lights.hidden) this.lights.focus();
    else if (!this.vest.hidden) this.vest.focus();
  }

  update(
    mission: MissionSystem,
    position: Vec2,
    helmetFastened: boolean,
    lightsOn: boolean,
    vestWorn: boolean,
    interrupted: boolean,
    checkpointHint: string | undefined,
    speed: number,
  ) {
    const { target, result, remainingSeconds, elapsedSeconds, shakeLevel } =
      mission;
    const title = mission.definition.tytul;
    if (this.displayedTitle !== title) {
      this.title.textContent = translate(title, this.orderText);
      this.displayedTitle = title;
    }
    const preparing = mission.preparingBike;
    setHidden(this.instruction, !target);
    setHidden(this.equip, !!result || helmetFastened);
    setHidden(this.lights, !preparing || lightsOn);
    setHidden(this.vest, !mission.preparingVest || vestWorn);
    setHidden(this.resume, !!result || !interrupted);
    setHidden(this.timer, !!result);
    setHidden(this.arrow.root, !!result || preparing);
    setHidden(this.parcel, !!result || shakeLevel === undefined);
    if (shakeLevel !== undefined && this.shocks.value !== shakeLevel)
      this.shocks.value = shakeLevel;
    const photoGoal = target?.goal.typ === 'sfotografuj';
    setHidden(this.photo, !photoGoal);
    const photoDisabled =
      interrupted || !photoGoal || !mission.canPhotograph(position, speed);
    if (this.photo.disabled !== photoDisabled)
      this.photo.disabled = photoDisabled;

    if (!target) return;

    setText(
      this.instruction,
      checkpointHint ??
        (helmetFastened || preparing
          ? target.eventWaypoint
            ? ui.missionUi.eventWaypoint
            : target.goal.opis
              ? translate(target.goal.opis, this.orderText)
              : ui.missionUi.goals[target.goal.typ]
          : ui.missionUi.helmetHint),
    );
    const seconds =
      remainingSeconds === undefined
        ? Math.floor(elapsedSeconds)
        : Math.ceil(remainingSeconds);
    if (this.displayedSeconds !== seconds) {
      this.timer.textContent = missionClock(seconds);
      this.displayedSeconds = seconds;
    }
    this.arrow.draw(
      target.position.x - position.x,
      target.position.y - position.y,
    );
  }
}
