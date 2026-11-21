import { Scene } from 'phaser';
import { loadContent } from '../content/load';
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
    void loadContent()
      .then((content) => this.scene.start('MainMenu', content))
      .catch(showError);
  }
}
