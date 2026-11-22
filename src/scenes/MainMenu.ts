import { audio } from '../audio/GameAudio';
import { Scene } from 'phaser';
import type { GameContent } from '../content/schemas';
import type { MissionProgress } from '../gameplay/MissionProgress';
import { progressPanels } from '../ui/ProgressPanels';
import { examPanel } from '../ui/ExamPanel';
import type { ExamResult } from '../gameplay/exam/exam';
import { quizPanel } from '../ui/QuizPanel';
import { progressNotice, skillMapButton } from '../ui/SkillMap';
import { FONT, ui } from '../core/presentation';
import { readHelmetColor, setHelmetColor } from '../core/helmetColor';
import { helmetColors } from '../render/spriteFrames';
export class MainMenu extends Scene {
  constructor() {
    super('MainMenu');
  }
  create(data?: GameContent | { examResult?: ExamResult }) {
    // Data has passed the same schema at build time and at the loading boundary.
    if (data && 'przepisy' in data) this.registry.set('content', data);
    const gameContent = this.registry.get('content') as GameContent;
    const progress = this.registry.get('missionProgress') as MissionProgress;
    const skills = skillMapButton(progress, gameContent);
    const panels = progressPanels(progress, gameContent);
    const quiz = quizPanel(progress, gameContent);
    const exam = examPanel(progress, gameContent, (attempt) =>
      this.scene.start('Plac', { attempt, rehearsal: !attempt }),
    );
    const menuDialogOpen = () =>
      skills.dialog.open ||
      panels.dialog.open ||
      quiz.dialog.open ||
      exam.dialog.open;
    const notice = document.createElement('p');
    notice.className = 'menu-save-notice';
    notice.setAttribute('role', 'status');
    notice.textContent = progressNotice(progress);
    const campaign = document.createElement('button');
    campaign.type = 'button';
    campaign.className = 'menu-mission';
    campaign.textContent = ui.cityPicker.campaign;
    campaign.addEventListener('click', () =>
      this.scene.start('CityPicker', { mode: 'campaign' }),
    );
    const freeRide = document.createElement('button');
    freeRide.type = 'button';
    freeRide.className = 'menu-mission menu-free-ride';
    freeRide.textContent = ui.cityPicker.freeRide;
    freeRide.addEventListener('click', () =>
      this.scene.start('CityPicker', { mode: 'freeRide' }),
    );
    const plac = document.createElement('button');
    plac.type = 'button';
    plac.textContent = ui.plac.title;
    plac.addEventListener('click', () => this.scene.start('Plac', {}));
    const training = document.createElement('div');
    training.className = 'menu-training';
    training.append(plac, quiz.button, exam.button);
    const helmetLabel = document.createElement('label');
    helmetLabel.className = 'menu-helmet';
    helmetLabel.textContent = ui.helmet.label;
    const helmet = document.createElement('select');
    for (const color of helmetColors)
      helmet.add(new Option(ui.helmet[color], color));
    helmet.value = readHelmetColor();
    helmet.addEventListener('change', () => {
      const selected = helmetColors.find((color) => color === helmet.value);
      if (selected) setHelmetColor(selected);
    });
    helmetLabel.append(helmet);
    document.body.append(
      campaign,
      freeRide,
      training,
      quiz.dialog,
      exam.dialog,
      helmetLabel,
      skills.button,
      skills.dialog,
      panels.navigation,
      panels.dialog,
      notice,
    );
    const g = this.add.graphics();
    g.fillStyle(0x1a1c2c).fillRect(0, 0, 640, 360);
    g.fillStyle(0x257179).fillRect(0, 0, 8, 360);
    g.fillStyle(0x333c57).fillRect(0, 318, 640, 42);
    for (let x = 16; x < 640; x += 48)
      g.fillStyle(0xffcd75).fillRect(x, 338, 24, 3);
    g.lineStyle(1, 0x566c86).strokeRect(28, 24, 584, 280);
    g.fillStyle(0xffcd75).fillRect(44, 43, 5, 5);
    const label = (
      x: number,
      y: number,
      text: string,
      size: number,
      color = '#f4f4f4',
    ) =>
      this.add.text(x, y, text, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        color,
      });
    label(58, 38, ui.edition, 12, '#ffcd75');
    label(44, 62, ui.title, 64, '#ffcd75');
    label(47, 127, ui.subtitle, 26);
    label(47, 166, ui.tagline, 14, '#c0cbdc');
    g.fillStyle(0x333c57).fillRect(44, 199, 272, 39);
    label(57, 207, ui.driving.startHint, 16);
    g.fillStyle(0xffcd75).fillRect(44, 242, 272, 39);
    g.fillStyle(0xffcd75).fillRect(325, 242, 272, 39);

    label(46, 282, ui.pangram, 16);
    // Small, original bicycle emblem; decorative menu art, no world renderer.
    g.lineStyle(4, 0xffcd75);
    g.strokeCircle(471, 226, 25).strokeCircle(555, 226, 25);
    g.lineBetween(471, 226, 494, 183).lineBetween(494, 183, 523, 226);
    g.lineBetween(523, 226, 471, 226).lineBetween(494, 183, 541, 183);
    g.lineBetween(541, 183, 555, 226).lineBetween(523, 226, 541, 183);
    g.lineBetween(484, 180, 505, 180)
      .lineBetween(541, 183, 537, 170)
      .lineBetween(537, 170, 550, 170);
    label(433, 284, ui.footer, 12, '#c0cbdc');
    this.add
      .zone(180, 219, 272, 39)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (!menuDialogOpen()) this.scene.start('City');
      });
    const center = () => {
      this.cameras.main.setScroll(
        -Math.floor((this.scale.width - 640) / 2),
        -Math.floor((this.scale.height - 360) / 2),
      );
      for (const button of [
        campaign,
        freeRide,
        training,
        helmetLabel,
        skills.button,
        panels.navigation,
      ])
        button.style.setProperty('--menu-zoom', String(this.scale.zoom));
    };
    center();
    this.scale.on('resize', center);
    const startDrive = (event: KeyboardEvent) => {
      if (
        event.target !== campaign &&
        event.target !== freeRide &&
        event.target !== plac &&
        event.target !== quiz.button &&
        event.target !== exam.button &&
        event.target !== helmet &&
        event.target !== skills.button &&
        !menuDialogOpen() &&
        !(
          event.target instanceof Node &&
          panels.navigation.contains(event.target)
        )
      )
        this.scene.start('City');
    };
    this.input.keyboard?.on('keydown-ENTER', startDrive);
    this.events.once('shutdown', () => {
      audio.stopReading('lesson');
      this.scale.off('resize', center);
      this.input.keyboard?.off('keydown-ENTER', startDrive);
      campaign.remove();
      freeRide.remove();
      training.remove();
      quiz.dialog.remove();
      exam.dialog.remove();
      helmetLabel.remove();
      skills.button.remove();
      skills.dialog.remove();
      panels.navigation.remove();
      panels.dialog.remove();
      notice.remove();
    });
    const canvas = this.game.canvas;
    canvas.setAttribute(
      'aria-label',
      `${ui.canvasLabel}. ${ui.pangram}. ${ui.status}`,
    );
    canvas.setAttribute('role', 'img');
    canvas.dataset.scene = this.scene.key;
    canvas.dataset.pangram = ui.pangram;
    if (data && 'examResult' in data && data.examResult) {
      // Phaser otherwise reuses the previous payload on a normal menu visit.
      this.sys.settings.data = {};
      exam.showResult(data.examResult);
    }
  }
}
