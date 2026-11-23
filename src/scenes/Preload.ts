import { isTutorialStep } from '../gameplay/Tutorial';
import versions from 'virtual:ranking-versions';
import { RankingClient } from '../rankings/RankingClient';
import { rankingUrl } from '../platform/parentZoneConfig';
import { Scene } from 'phaser';
import { audio } from '../audio/GameAudio';
import { loadContent } from '../content/load';
import { loadMissionProgress } from '../gameplay/MissionProgress';
import { applyAccessibility } from '../ui/RidePreferences';
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
        const url = rankingUrl(import.meta.env.VITE_RANKING_URL);
        if (url && versions) {
          progress.rankings = new RankingClient(progress.store, url, versions);
          progress.rankings.start(content.przepisy.przepisy);
        }
        audio.configure(progress.store.profile.audio);
        applyAccessibility(progress.store.profile);
        this.registry.set('missionProgress', progress);
        document.getElementById('pwa-splash')?.remove();
        this.registry.set('content', content);
        const tutorial = progress.store.profile.tutorial;
        if (isTutorialStep(tutorial)) this.scene.start('City', { tutorial });
        else this.scene.start('MainMenu');
      })
      .catch(showError);
  }
}
