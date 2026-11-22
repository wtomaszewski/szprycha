import { audio } from '../audio/GameAudio';
import { Scene } from 'phaser';
import type { GameContent } from '../content/schemas';
import type { MissionProgress } from '../gameplay/MissionProgress';
import { progressPanels } from '../ui/ProgressPanels';
import { examPanel } from '../ui/ExamPanel';
import type { ExamResult } from '../gameplay/exam/exam';
import { quizPanel } from '../ui/QuizPanel';
import { progressNotice, skillMapButton } from '../ui/SkillMap';
import { ui } from '../core/presentation';
import { parentZone } from '../ui/ParentZone';
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
    const parents = parentZone(progress, gameContent.balans.zdrowe_granie);
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
      exam.dialog.open ||
      parents.dialog.open;
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
    freeRide.className = 'menu-mission';
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
    helmet.value = progress.store.profile.avatarId;
    helmet.addEventListener('change', () => {
      const selected = helmetColors.find((color) => color === helmet.value);
      if (selected)
        progress.store.change((profile) => {
          profile.avatarId = selected;
        });
    });
    helmetLabel.append(helmet);
    const menu = document.createElement('section');
    menu.className = 'main-menu';
    menu.setAttribute('aria-labelledby', 'main-menu-title');
    const intro = document.createElement('header');
    const title = document.createElement('h1');
    title.id = 'main-menu-title';
    title.textContent = ui.title;
    const subtitle = document.createElement('p');
    subtitle.textContent = ui.subtitle;
    intro.append(title, subtitle);

    const ride = document.createElement('div');
    ride.className = 'menu-ride';
    const practice = document.createElement('button');
    practice.type = 'button';
    practice.textContent = ui.driving.title;
    practice.addEventListener('click', () => this.scene.start('City'));
    ride.append(campaign, freeRide, practice);
    const options = document.createElement('div');
    options.className = 'menu-options';
    options.append(helmetLabel, skills.button, parents.button);
    menu.append(intro, ride, training, panels.navigation, options, notice);
    document.body.append(
      menu,
      quiz.dialog,
      exam.dialog,
      skills.dialog,
      panels.dialog,
      parents.dialog,
    );
    const startDrive = (event: KeyboardEvent) => {
      if (
        !menuDialogOpen() &&
        !(event.target instanceof Node && menu.contains(event.target))
      )
        this.scene.start('City');
    };
    this.input.keyboard?.on('keydown-ENTER', startDrive);
    this.events.once('shutdown', () => {
      audio.stopReading('lesson');
      this.input.keyboard?.off('keydown-ENTER', startDrive);
      menu.remove();
      quiz.dialog.remove();
      exam.dialog.remove();
      skills.dialog.remove();
      panels.dialog.remove();
      parents.dialog.remove();
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
