import { PNG } from 'pngjs';
import { artHash } from '../src/render/artFrames.ts';
import { EFFECT_TILE, effectFrame } from '../src/render/effectFrames.ts';

export function effectArt() {
  const width = EFFECT_TILE * Object.keys(effectFrame).length;
  const sheet = new PNG({ width, height: EFFECT_TILE });

  const dot = (
    frame: number,
    x: number,
    y: number,
    color: number,
    alpha: number,
  ) => {
    const offset = (y * width + frame * EFFECT_TILE + x) * 4;
    sheet.data[offset] = (color >> 16) & 255;
    sheet.data[offset + 1] = (color >> 8) & 255;
    sheet.data[offset + 2] = color & 255;
    sheet.data[offset + 3] = Math.round(alpha * 255);
  };

  const bands = (strength: number) => Math.ceil(Math.max(0, strength) * 7) / 7;

  for (let y = 0; y < EFFECT_TILE; y++)
    for (let x = 0; x < EFFECT_TILE; x++) {
      const dx = x - 64;
      const dy = y - 64;
      const radius = Math.hypot(dx, dy);
      if (radius <= 60) {
        dot(effectFrame.lamp, x, y, 0xffcd75, bands(1 - radius / 60) * 0.39);
      }
      const neon = 1 - Math.hypot(dx / 48, dy / 31);
      if (neon > 0) {
        const tube = Math.abs(dx) < 15 && (dy === -2 || dy === 2);
        dot(
          effectFrame.neon,
          x,
          y,
          tube ? 0x73eff7 : 0xff77a8,
          tube ? 0.95 : bands(neon) * 0.27,
        );
      }
      const bike = x / 120;
      const bikeWidth = 2 + 21 * bike;
      if (bike < 1 && Math.abs(dy) <= bikeWidth) {
        const strength = (1 - bike) * (1 - (0.65 * Math.abs(dy)) / bikeWidth);
        dot(effectFrame.bike, x, y, 0xf4f4f4, bands(strength) * 0.43);
      }
      const car = x / 120;
      const carWidth = 3 + 19 * car;
      const side = Math.abs(Math.abs(dy) - (9 + 4 * car));
      if (car < 1 && side <= carWidth) {
        const strength = (1 - car) * (1 - (0.7 * side) / carWidth);
        dot(effectFrame.car, x, y, 0xf0dca8, bands(strength) * 0.36);
      }
    }
  for (let i = 0; i < 24; i++) {
    const n = artHash(i, 32, 42);
    const x = n & 127;
    const y = (n >>> 9) & 127;
    for (let step = 0; step < 5 + ((n >>> 27) % 7); step++)
      dot(
        effectFrame.rain,
        (x + (step >> 1)) & 127,
        (y + step) & 127,
        0x94b0c2,
        0.24 + step * 0.024,
      );
  }

  return sheet;
}
