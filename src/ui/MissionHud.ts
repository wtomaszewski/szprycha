import { missionClock, translate, ui } from '../core/presentation';
import type { MissionSystem } from '../gameplay/MissionSystem';
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
  private readonly navigation = document.createElement('div');
  private readonly navigationSize = { width: 0, height: 0 };
  private readonly resize = new ResizeObserver(([entry]) => {
    if (entry) {
      const { width, height } = entry.contentRect;
      Object.assign(this.navigationSize, { width, height });
    }
  });
  private readonly arrow = document.createElement('div');
  private readonly bearing = document.createElement('span');
  private readonly distance = document.createElement('span');
  private readonly equip = document.createElement('button');
  private readonly parcel = document.createElement('label');
  private readonly shocks = document.createElement('progress');
  private readonly photo = document.createElement('button');
  private readonly lights = document.createElement('button');
  private readonly resume = document.createElement('button');
  private displayedTitle?: string;
  private displayedSeconds?: number;
  private displayedDistance?: number;

  constructor(
    parent: HTMLElement,
    timerSlot: HTMLElement,
    equipHelmet: () => void,
    turnOnLights: () => void,
    resumeFromCheckpoint: () => void,
    photograph: () => void,
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
      this.resume,
      this.parcel,
      this.photo,
    );

    this.timer.className = 'mission-timer';
    this.timer.setAttribute('aria-label', ui.missionUi.timer);
    this.timer.setAttribute('aria-live', 'off');

    this.navigation.className = 'mission-navigation';
    this.arrow.className = 'mission-arrow';
    this.arrow.setAttribute('role', 'img');
    this.bearing.className = 'mission-bearing';
    this.distance.className = 'mission-distance';
    this.arrow.append(this.bearing, this.distance);
    this.navigation.append(this.arrow);
    this.resize.observe(this.navigation);

    this.equip.type = this.lights.type = this.resume.type = 'button';
    this.lights.textContent = ui.missionUi.turnOnLights;
    this.lights.addEventListener('click', turnOnLights);
    this.equip.textContent = ui.missionUi.equip;
    this.resume.textContent = ui.missionUi.continue;
    this.equip.addEventListener('click', equipHelmet);
    this.resume.addEventListener('click', resumeFromCheckpoint);

    timerSlot.append(this.timer);
    parent.append(panel, this.navigation);
  }

  destroy() {
    this.resize.disconnect();
  }

  focusEquipment() {
    if (!this.equip.hidden) this.equip.focus();
    else if (!this.lights.hidden) this.lights.focus();
  }

  update(
    mission: MissionSystem,
    position: Vec2,
    helmetFastened: boolean,
    lightsOn: boolean,
    interrupted: boolean,
    checkpointHint: string | undefined,
    speed: number,
  ) {
    const { target, result, remainingSeconds, elapsedSeconds, shakeLevel } =
      mission;
    const title = mission.definition.tytul;
    if (this.displayedTitle !== title) {
      this.title.textContent = translate(title);
      this.displayedTitle = title;
    }
    const preparing = mission.preparingBike;
    setHidden(this.instruction, !target);
    setHidden(this.equip, !!result || helmetFastened);
    setHidden(this.lights, !preparing || lightsOn);
    setHidden(this.resume, !!result || !interrupted);
    setHidden(this.timer, !!result);
    setHidden(this.navigation, !!result || preparing);
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
              ? translate(target.goal.opis)
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
    this.drawArrow(
      target.position.x - position.x,
      target.position.y - position.y,
    );
  }

  private drawArrow(dx: number, dy: number) {
    const { width, height } = this.navigationSize;
    if (width === 0 || height === 0) return;
    const magnitude = Math.max(Math.abs(dx) / width, Math.abs(dy) / height);
    const x = magnitude === 0 ? width : (width + dx / magnitude) / 2;
    const y = magnitude === 0 ? height / 2 : (height + dy / magnitude) / 2;
    this.arrow.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    this.bearing.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    const pixels = Math.round(Math.hypot(dx, dy));
    if (this.displayedDistance !== pixels) {
      this.displayedDistance = pixels;
      const distance = `${pixels} ${ui.missionUi.distanceUnit}`;
      this.distance.textContent = distance;
      this.arrow.setAttribute(
        'aria-label',
        `${ui.missionUi.direction} · ${distance}`,
      );
    }
  }
}
