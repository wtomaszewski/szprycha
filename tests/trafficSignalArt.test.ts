import type { GameObjects } from 'phaser';
import { describe, expect, it } from 'vitest';
import {
  drawCrossingSignal,
  drawLaneSignal,
} from '../src/render/TrafficSignalArt';

function recording() {
  let fill = 0;
  let stroke = 0;
  const lenses: [number, number, number, number][] = [];
  const lines: [number, number, number, number, number][] = [];
  const graphics = {
    fillStyle(color: number) {
      fill = color;
      return this;
    },
    fillRect() {
      return this;
    },
    fillCircle(x: number, y: number, radius: number) {
      lenses.push([x, y, radius, fill]);
      return this;
    },
    lineStyle(_width: number, color: number) {
      stroke = color;
      return this;
    },
    lineBetween(x: number, y: number, toX: number, toY: number) {
      lines.push([x, y, toX, toY, stroke]);
      return this;
    },
    strokeCircle(x: number, y: number, radius: number) {
      lenses.push([x, y, radius, stroke]);
      return this;
    },
  };
  return { art: graphics as unknown as GameObjects.Graphics, lenses, lines };
}

describe('traffic signal artwork', () => {
  it.each([
    ['red', 0, 0xf04a4b],
    ['yellow', 1, 0xfeae34],
    ['green', 2, 0xa7f070],
    ['arrow', 0, 0xf04a4b],
    ['off', -1, 0],
  ] as const)('draws the S-1 lamps for %s', (phase, active, color) => {
    const { art, lenses } = recording();
    drawLaneSignal(art, 0, 0, phase, 'S-1');
    expect(lenses).toEqual(
      [-7, 0, 7].map((y, i) =>
        i === active ? [0, y, 3.5, color] : [0, y, 2.5, 0x333c57],
      ),
    );
  });

  it.each(['left', 'right'] as const)(
    'lights the %s S-2 arrow only in its phase',
    (kind) => {
      const { art, lines, lenses } = recording();
      for (const phase of ['red', 'yellow', 'green', 'off'] as const)
        drawLaneSignal(art, 0, 0, phase, kind);
      expect(lines).toEqual([]);
      expect(lenses).toEqual([]);

      drawLaneSignal(art, 0, 0, 'arrow', kind);
      const tip = kind === 'left' ? -4 : 4;
      expect(lines).toEqual([
        [-tip, 0, tip, 0, 0xa7f070],
        [tip, 0, 0, -4, 0xa7f070],
        [tip, 0, 0, 4, 0xa7f070],
      ]);
    },
  );

  it.each([false, true])(
    'distinguishes closed, open and dark heads at crossings (pedestrian: %s)',
    (pedestrian) => {
      const closed = recording();
      drawCrossingSignal(closed.art, 0, 0, 'red', pedestrian);
      expect(closed.lines[0]).toEqual([-5, -6, 5, -6, 0xf04a4b]);
      expect(closed.lenses.every((lens) => lens[3] === 0xf04a4b)).toBe(true);

      const open = recording();
      drawCrossingSignal(open.art, 0, 0, 'green', pedestrian);
      expect(open.lines).toHaveLength(closed.lines.length - 1);
      expect(open.lenses.every((lens) => lens[3] === 0xa7f070)).toBe(true);

      const dark = recording();
      drawCrossingSignal(dark.art, 0, 0, 'off', pedestrian);
      expect(dark.lines).toEqual([]);
      expect(dark.lenses).toEqual([]);
    },
  );
});
