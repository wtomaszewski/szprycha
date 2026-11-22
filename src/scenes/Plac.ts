import { Scene, type GameObjects } from 'phaser';
import type { PlacBalance, PlacCourse, PlacId } from '../content/plac';
import type { GameContent } from '../content/schemas';
import { readHelmetColor } from '../core/helmetColor';
import { showError, translate, ui } from '../core/presentation';
import { FIXED_STEP, METERS_PER_PIXEL } from '../gameplay/bicycle';
import type { MissionProgress } from '../gameplay/MissionProgress';
import {
  PlacRun,
  placIds,
  scorePlac,
  type GhostPose,
} from '../gameplay/plac/PlacRun';
import {
  placCourseKey,
  placTime,
  playGhost,
  rankPlac,
} from '../gameplay/plac/placRecords';
import { PlacArt } from '../render/PlacArt';
import { RiderArt } from '../render/RiderArt';
import { riderDirections, spriteDirection } from '../render/spriteFrames';
import { loadRiderArt } from '../render/TrafficArt';
import { DrivingControls } from '../ui/DrivingControls';
import { progressNotice } from '../ui/SkillMap';

const pointsFormat = new Intl.NumberFormat('pl-PL', {
  maximumFractionDigits: 2,
});
const seconds = (ticks: number) => `${placTime(ticks)} ${ui.plac.seconds}`;
const text = (tag: string, value: string) =>
  Object.assign(document.createElement(tag), { textContent: value });

export class Plac extends Scene {
  private course!: PlacCourse;
  private balance!: PlacBalance;
  private progress!: MissionProgress;
  private passThreshold = 0;
  private courseKey = '';
  private titles!: ReadonlyMap<string, string>;
  private controls!: DrivingControls;
  private art!: PlacArt;
  private riderArt!: RiderArt;
  private ghostArt!: GameObjects.Image;
  private readonly ghostPose: GhostPose = [0, 0, 0];
  private dialog!: HTMLDialogElement;
  private heading!: HTMLElement;
  private coach!: HTMLElement;
  private hud!: HTMLElement;
  private clock!: HTMLOutputElement;
  private meter!: HTMLMeterElement;
  private sequence!: HTMLElement;
  private run?: PlacRun;
  private arcade = false;
  private origin: 'MainMenu' | 'City' = 'MainMenu';
  private accumulator = 0;
  private completedAt = 0;
  private finishedTicks = 0;
  private shownClockTick = -1;
  private stride = 0;

  constructor() {
    super('Plac');
  }

  preload() {
    loadRiderArt(this);
    this.load.on('loaderror', showError);
    this.load.once('complete', () => this.load.off('loaderror', showError));
  }

  create({ origin = 'MainMenu' }: { origin?: 'MainMenu' | 'City' } = {}) {
    const content = this.registry.get('content') as GameContent;
    this.progress = this.registry.get('missionProgress') as MissionProgress;
    this.titles = new Map(
      content.przepisy.przepisy
        .filter(({ detektor }) => detektor === 'plac')
        .map(({ id, tytul }) => [id, tytul]),
    );
    this.course = content.plac;
    this.balance = content.balans.plac;
    this.passThreshold = content.balans.licencja.plac_prog;
    this.courseKey = placCourseKey(this.course, this.balance);
    this.origin = origin;
    this.art = new PlacArt(this, this.course);
    this.riderArt = new RiderArt(this, readHelmetColor());
    this.ghostArt = this.add
      .image(0, 0, 'rider', 0)
      .setDepth(18)
      .setAlpha(0.5)
      .setTint(0x73eff7)
      .setVisible(false);
    this.controls = new DrivingControls(
      ui.plac.title,
      { lite: false, rain: false },
      () => {},
      () => {
        if (this.run && !this.dialog.open)
          this.start(this.run.ids, this.arcade);
      },
      () => this.showLobby(),
      () => {
        this.accumulator = 0;
      },
      () => {},
      () => {},
      { keyboard: () => this.dialog.open, gamepad: () => this.dialog.open },
      true,
    );
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'game-dialog plac-dialog';
    this.dialog.setAttribute('aria-labelledby', 'plac-dialog-title');
    this.dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (this.run) this.showLobby();
      else this.leave();
    });
    this.hud = document.createElement('header');
    this.hud.className = 'plac-hud';
    this.heading = text('h1', ui.plac.title);
    this.heading.setAttribute('aria-live', 'polite');
    this.coach = document.createElement('p');
    this.coach.setAttribute('role', 'status');
    this.clock = document.createElement('output');
    this.clock.setAttribute('aria-label', ui.plac.time);
    this.clock.setAttribute('aria-live', 'off');
    this.meter = document.createElement('meter');
    this.meter.max = 1;
    this.meter.low = this.balance.physics.lock_pressure;
    this.meter.high = this.balance.physics.lock_pressure;
    this.meter.optimum = 0;
    this.meter.setAttribute('aria-label', ui.plac.brakeForce);
    this.sequence = document.createElement('span');
    this.sequence.className = 'plac-sequence';
    this.sequence.setAttribute('role', 'status');
    this.controls.details.append(this.clock, this.meter, this.sequence);
    this.hud.append(this.heading, this.coach, this.controls.details);
    this.controls.root.prepend(this.hud);
    document.body.append(this.dialog);
    const resize = () => {
      const { width, height } = this.scale;
      this.cameras.main
        .setZoom(
          Math.min(width / this.course.width, height / this.course.height),
        )
        .centerOn(this.course.width / 2, this.course.height / 2);
    };
    resize();
    this.scale.on('resize', resize);
    const canvas = this.game.canvas;
    canvas.dataset.scene = this.scene.key;
    canvas.setAttribute('aria-label', ui.plac.title);
    this.events.once('shutdown', () => {
      this.scale.off('resize', resize);
      this.controls.destroy();
      this.dialog.remove();
      delete canvas.dataset.placExercise;
      delete canvas.dataset.placGrade;
      void this.progress.store.flush();
    });
    this.showLobby();
  }

  private leave() {
    this.scene.start(this.origin);
  }

  private get exitLabel() {
    return this.origin === 'City' ? ui.plac.returnToMap : ui.driving.menu;
  }

  private get records() {
    const saved = this.progress.store.profile.plac;
    return saved?.course === this.courseKey ? saved : undefined;
  }

  private button(label: string, action: () => void) {
    const button = text('button', label);
    button.addEventListener('click', action);
    return button;
  }

  private dialogTitle(title: string) {
    const heading = text('h2', title);
    heading.id = 'plac-dialog-title';
    return heading;
  }

  private ranking() {
    const section = document.createElement('section');
    section.className = 'plac-ranking';
    section.append(text('h3', ui.plac.ranking));
    const times = this.records?.times.slice(0, this.balance.ranking_limit);
    if (!times?.length) section.append(text('p', ui.plac.emptyRanking));
    else {
      const list = document.createElement('ol');
      for (const time of times) list.append(text('li', seconds(time)));
      section.append(list);
    }
    const notice = progressNotice(this.progress);
    if (notice) section.append(text('p', notice));
    return section;
  }

  private showLobby() {
    const practiced = !!this.run && this.run.ride.ticks > 0;
    this.run = undefined;
    this.hud.hidden = true;
    this.ghostArt.setVisible(false);
    this.art.show(placIds[0]!);
    delete this.game.canvas.dataset.placExercise;
    delete this.game.canvas.dataset.placGrade;
    const select = document.createElement('select');
    select.setAttribute('aria-label', ui.plac.exercise);
    select.add(new Option(ui.plac.fullCourse, 'all'));
    for (const id of placIds) select.add(new Option(this.titles.get(id), id));
    const actions = document.createElement('div');
    actions.className = 'plac-actions';
    actions.append(
      select,
      this.button(ui.plac.start, () => {
        const exercise = placIds.find((id) => id === select.value);
        this.start(exercise ? [exercise] : placIds, false);
      }),
      this.button(ui.plac.arcade, () => this.start(placIds, true)),
      this.button(this.exitLabel, () => this.leave()),
    );
    this.dialog.replaceChildren(
      this.dialogTitle(ui.plac.title),
      actions,
      this.ranking(),
    );
    if (practiced) this.dialog.append(text('p', ui.plac.practiceOutside));
    if (!this.dialog.open) this.dialog.showModal();
    select.focus();
  }

  private start(ids: readonly PlacId[], arcade: boolean) {
    this.dialog.close();
    this.controls.focus();
    this.arcade = arcade;
    this.finishedTicks = 0;
    this.shownClockTick = -1;
    this.run = new PlacRun(
      this.course,
      this.balance,
      this.controls.actions,
      ids,
      arcade,
    );
    this.hud.hidden = false;
    this.prepare(this.run);
  }

  private prepare(run: PlacRun) {
    this.accumulator = this.completedAt = this.stride = 0;
    this.controls.clear();
    this.controls.actions.signal = null;
    this.controls.actions.looking = false;
    this.art.show(run.id);
    this.game.canvas.dataset.placExercise = run.id;
    delete this.game.canvas.dataset.placGrade;
    this.heading.textContent = `${run.index + 1}/${run.ids.length} · ${this.titles.get(run.id)}`;
    this.coach.textContent = `${ui.plac.coach} · ${translate(this.course.exercises[run.id].hint)}`;
    this.clock.hidden = !this.arcade;
    const ghost = this.arcade && this.records;
    this.clock.setAttribute('aria-description', ghost ? ui.plac.ghost : '');
    this.clock.title = ghost ? ui.plac.ghost : '';
    this.meter.hidden = run.id !== 'PLAC-04';
    this.sequence.hidden = run.id !== 'PLAC-05';
    this.render(run);
  }

  private results(run: PlacRun) {
    const score = scorePlac(run.results, this.balance, this.passThreshold);
    if (this.arcade && score.clean) {
      const { balance, courseKey } = this;
      this.progress.store.change((profile) => {
        profile.plac = rankPlac(
          profile.plac,
          courseKey,
          balance,
          score,
          run.ghost,
        )!;
      });
    }
    const title =
      run.ids.length === 1
        ? ui.plac.completed
        : score.passed
          ? ui.plac.passed
          : ui.plac.failed;
    const summary = [
      `${ui.plac.points} ${pointsFormat.format(score.points)} / ${pointsFormat.format(score.max)}`,
    ];
    if (this.arcade) {
      summary.push(
        seconds(score.ticks),
        score.medal ? ui.plac.medals[score.medal] : ui.plac.noMedal,
      );
      if (score.clean) summary.push(ui.plac.clean);
    }
    const rows = document.createElement('ul');
    rows.className = 'plac-results';
    for (const { id, grade } of run.results) {
      rows.append(
        text(
          'li',
          `${this.titles.get(id)} · ${ui.plac.grades[grade]} · ${pointsFormat.format(this.balance.points[grade])}`,
        ),
      );
    }
    const actions = document.createElement('div');
    actions.className = 'plac-actions';
    actions.append(
      this.button(ui.plac.retry, () => this.start(run.ids, this.arcade)),
      this.button(ui.plac.return, () => this.showLobby()),
      this.button(this.exitLabel, () => this.leave()),
    );
    this.dialog.replaceChildren(
      this.dialogTitle(title),
      text('p', summary.join(' · ')),
      rows,
      actions,
    );
    if (this.arcade) this.dialog.append(this.ranking());
    this.dialog.append(text('p', ui.plac.practiceOutside));
    this.dialog.showModal();
  }

  update(_time: number, delta: number) {
    const { run, controls } = this;
    if (!run || this.dialog.open) return;
    const input = controls.read();
    if (controls.paused) return;
    this.accumulator += Math.min(delta / 1000, 0.1);
    while (this.accumulator >= FIXED_STEP) {
      this.accumulator -= FIXED_STEP;
      if (run.result) {
        if (++this.completedAt * FIXED_STEP >= this.balance.feedback_s) {
          this.finishedTicks += run.result.ticks;
          if (run.advance()) this.prepare(run);
          else this.results(run);
          return;
        }
        continue;
      }
      const result = run.step(input);
      this.stride = (this.stride + (run.ride.rider.speed * FIXED_STEP) / 8) % 4;
      if (result) {
        const fault = [...result.faults].find(
          ([, grade]) => grade === result.grade,
        )?.[0];
        this.game.canvas.dataset.placGrade = result.grade;
        this.coach.textContent = fault
          ? `${ui.plac.coach} · ${ui.plac.faults[fault]}`
          : ui.plac.grades.good;
      }
    }
    this.render(run);
  }

  private render(run: PlacRun) {
    const { ride, detector } = run;
    const { rider, ticks } = ride;
    const time = ticks * FIXED_STEP;
    this.riderArt.draw(
      {
        rider: { ...rider, heading: ride.visualHeading },
        actions: this.controls.actions,
        at: time,
        riderStride: this.stride,
        dismountAt: -Infinity,
      },
      false,
    );
    this.art.update(run.id, detector, (ticks + this.completedAt) * FIXED_STEP);
    const speed = `${Math.round(rider.speed * METERS_PER_PIXEL * 3.6)} ${ui.driving.unit}`;
    if (this.controls.speed.value !== speed) this.controls.speed.value = speed;
    if (this.arcade) {
      const elapsed = this.finishedTicks + ticks;
      const displayTick = run.result
        ? elapsed
        : Math.max(this.finishedTicks, elapsed - (elapsed % 6));
      if (this.shownClockTick !== displayTick) {
        this.shownClockTick = displayTick;
        this.clock.value = seconds(displayTick);
      }
    }
    if (run.id === 'PLAC-04') this.meter.value = ride.brakePressure;
    if (run.id === 'PLAC-05') {
      const label = ui.plac.sequence[detector.nextMarker]!;
      if (this.sequence.textContent !== label)
        this.sequence.textContent = label;
    }
    const ghost = this.arcade ? this.records?.ghost[run.index] : undefined;
    const showGhost = !!ghost && playGhost(ghost, ticks, this.ghostPose);
    this.ghostArt.setVisible(showGhost);
    if (showGhost) {
      const [x, y, heading] = this.ghostPose;
      this.ghostArt
        .setPosition(x, y)
        .setFrame(spriteDirection(heading, riderDirections));
    }
  }
}
