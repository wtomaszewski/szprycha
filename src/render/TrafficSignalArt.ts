import type { GameObjects } from 'phaser';
import type { SignalPhase } from '../rules/types';

const colors = { red: 0xf04a4b, yellow: 0xfeae34, green: 0xa7f070 };
const lamps = ['red', 'yellow', 'green'] as const;

export function signalHousing(
  art: GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  art
    .fillStyle(0x94b0c2)
    .fillRect(x - width / 2, y - height / 2, width, height)
    .fillStyle(0x1a1c2c)
    .fillRect(x - width / 2 + 2, y - height / 2 + 2, width - 4, height - 4);
}

export function signalLamp(
  art: GameObjects.Graphics,
  x: number,
  y: number,
  active?: keyof typeof colors,
) {
  art
    .fillStyle(active ? colors[active] : 0x333c57)
    .fillCircle(x, y, active ? 3.5 : 2.5);
}

export function drawLaneSignal(
  art: GameObjects.Graphics,
  x: number,
  y: number,
  phase: SignalPhase,
  kind: 'tram' | 'S-1' | 'left' | 'right',
) {
  signalHousing(art, x, y, 16, 26);
  if (kind === 'tram') {
    art.lineStyle(3, 0xf4f4f4);
    if (phase === 'green') art.lineBetween(x, y - 5, x, y + 5);
    else if (phase !== 'off') art.lineBetween(x - 5, y, x + 5, y);
  } else if (kind === 'S-1') {
    const active = phase === 'arrow' ? 'red' : phase;
    for (const [index, lamp] of lamps.entries()) {
      const lit =
        active === lamp || (phase === 'red-yellow' && lamp !== 'green');
      signalLamp(art, x, y + (index - 1) * 7, lit ? lamp : undefined);
    }
  } else if (phase === 'arrow') {
    const d = kind === 'right' ? 1 : -1;
    art
      .lineStyle(2.5, colors.green)
      .lineBetween(x - 4 * d, y, x + 4 * d, y)
      .lineBetween(x + 4 * d, y, x, y - 4)
      .lineBetween(x + 4 * d, y, x, y + 4);
  }
}

export function drawCrossingSignal(
  art: GameObjects.Graphics,
  x: number,
  y: number,
  phase: SignalPhase,
  pedestrian: boolean,
  lightAt: number,
  reducedEffects: boolean,
) {
  signalHousing(art, x, y, 20, 20);
  if (phase === 'off') return;
  const flashing = phase === 'flashing-green';
  const open = phase === 'green' || flashing;
  const color =
    flashing && !reducedEffects && Math.floor(lightAt * 4) % 2
      ? 0x566c86
      : colors[open ? 'green' : 'red'];
  if (!open) art.lineStyle(2, color).lineBetween(x - 5, y - 6, x + 5, y - 6);
  if (pedestrian) {
    art
      .fillStyle(color)
      .fillCircle(x, y - 3, 2)
      .lineStyle(2, color)
      .lineBetween(x, y - 1, x, y + 2)
      .lineBetween(x, y, x - 3, y + 1)
      .lineBetween(x, y, x + 3, y + 1)
      .lineBetween(x, y + 2, x - 2, y + 5)
      .lineBetween(x, y + 2, x + 2, y + 5);
  } else {
    art
      .lineStyle(1.75, color)
      .strokeCircle(x - 4, y + 2, 2.5)
      .strokeCircle(x + 4, y + 2, 2.5)
      .lineBetween(x - 4, y + 2, x - 1, y - 3)
      .lineBetween(x - 1, y - 3, x + 4, y + 2)
      .lineBetween(x - 4, y + 2, x + 4, y + 2);
  }
}
