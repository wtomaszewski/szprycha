import { Scene } from 'phaser';
import { audio } from '../audio/GameAudio';
import { loadContent } from '../content/load';
import { loadMissionProgress } from '../gameplay/MissionProgress';
import { FONT, ui, showError } from '../core/presentation';
export class Preload extends Scene {
  constructor() {
    super('Preload');
  }
  create() {
    this.add
      .text(320, 180, ui.loading, {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#ffcd75',
      })
      .setOrigin(0.5);
    void Promise.all([loadContent(), loadMissionProgress()])
      .then(([content, progress]) => {
        audio.configure(progress.store.profile.audio);
        this.registry.set('missionProgress', progress);
        document.getElementById('pwa-splash')?.remove();
        this.scene.start('MainMenu', content);
      })
      .catch(showError);
  }
}
