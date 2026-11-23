import { Scene } from 'phaser';
import { arcadeFont, readingFont } from '../core/fonts';
import { ui, showError } from '../core/presentation';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const sample = `0123456789 ${ui.pangram} ${ui.glyphs}`;
    void Promise.all([
      document.fonts.load(`8px "${arcadeFont}"`, sample),
      document.fonts.load(`24px "${readingFont}"`, sample),
    ])
      .then((faces) => {
        if (faces.some((font) => font.length !== 2))
          throw new Error('Pixel font subsets unavailable');
        this.scene.start('Preload');
      })
      .catch(showError);
  }
}
