import { Scene } from 'phaser';
import { FONT, ui, showError } from '../core/presentation';
export class Boot extends Scene {
  constructor() {
    super('Boot');
  }
  create() {
    void document.fonts
      .load(`20px "${FONT}"`, ui.pangram + ui.glyphs)
      .then((fonts) => {
        if (!fonts.length) throw new Error('Pixel font unavailable');
        this.scene.start('Preload');
      })
      .catch(showError);
  }
}
