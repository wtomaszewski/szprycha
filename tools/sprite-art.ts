import { PNG } from 'pngjs';
import {
  emergencyTypes,
  helmetColors,
  largeVehicleTypes,
  pedestrianTypes,
  riderPoses,
  riderDirections,
  pedestrianDirections,
  smallVehicleTypes,
  spriteSheets,
  vehiclePaints,
  type SpriteSheet,
} from '../src/render/spriteFrames';

const ink = 0x1a1c2c,
  shadow = 0x333c57,
  gray = 0x566c86,
  steel = 0xc0cbdc;
const white = 0xf4f4f4,
  gold = 0xffcd75,
  orange = 0xef7d57,
  amber = 0xfeae34;
const red = 0xe43b44,
  burgundy = 0xb13e53,
  cyan = 0x73eff7,
  blue = 0x41a6f6;
const royal = 0x3b5dc9,
  navy = 0x29366f,
  green = 0x38b764,
  mint = 0xa7f070;
const teal = 0x257179,
  pink = 0xff77a8,
  purple = 0x5d275d,
  cream = 0xf0dca8;
const skin = 0xe8c39e,
  tan = 0xd98a5a,
  brown = 0x8b6d5c;

function pixel(png: PNG, x: number, y: number, color: number, alpha: number) {
  const offset = (y * png.width + x) * 4;
  png.data[offset] = color >>> 16;
  png.data[offset + 1] = color >>> 8;
  png.data[offset + 2] = color;
  png.data[offset + 3] = alpha;
}

class Tile {
  readonly image: PNG;

  constructor(width: number, height: number) {
    this.image = new PNG({ width, height });
  }

  rect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha = 255,
  ) {
    for (
      let py = Math.max(0, y);
      py < Math.min(y + height, this.image.height);
      py++
    )
      for (
        let px = Math.max(0, x);
        px < Math.min(x + width, this.image.width);
        px++
      )
        pixel(this.image, px, py, color, alpha);
  }

  bevel(x: number, y: number, width: number, height: number, color: number) {
    this.rect(x + 1, y, width - 2, height, color);
    this.rect(x, y + 1, width, height - 2, color);
  }

  line(
    x: number,
    y: number,
    toX: number,
    toY: number,
    color: number,
    wide = 1,
  ) {
    const steps = Math.max(Math.abs(toX - x), Math.abs(toY - y), 1);
    for (let i = 0; i <= steps; i++)
      this.rect(
        Math.round(x + ((toX - x) * i) / steps),
        Math.round(y + ((toY - y) * i) / steps),
        wide,
        wide,
        color,
      );
  }
}

type Paint = (tile: Tile, row: number, column: number) => void;

function sheet(id: SpriteSheet, paint: Paint, directions = 0) {
  const [width, height, columns, rows] = spriteSheets[id];
  const result = new PNG({ width: width * columns, height: height * rows });
  if (directions) {
    for (let row = 0; row < (rows * columns) / directions; row++) {
      const tile = new Tile(width, height);
      paint(tile, row, 0);
      for (let direction = 0; direction < directions; direction++) {
        const angle = (2 * Math.PI * direction) / directions;
        const frame = row * directions + direction;
        const frameX = (frame % columns) * width;
        const frameY = Math.floor(frame / columns) * height;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const cx = (width - 1) / 2;
        const cy = (height - 1) / 2;
        for (let y = 0; y < height; y++)
          for (let x = 0; x < width; x++) {
            const u = Math.round(cx + (x - cx) * c + (y - cy) * s);
            const v = Math.round(cy - (x - cx) * s + (y - cy) * c);
            if (u < 0 || v < 0 || u >= width || v >= height) continue;
            const from = (v * width + u) * 4;
            const to = ((frameY + y) * result.width + frameX + x) * 4;
            tile.image.data.copy(result.data, to, from, from + 4);
          }
      }
    }
  } else {
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const tile = new Tile(width, height);
        paint(tile, row, column);
        PNG.bitblt(
          tile.image,
          result,
          0,
          0,
          width,
          height,
          column * width,
          row * height,
        );
      }
    }
  }
  return result;
}

const riderPaint = [
  [orange, burgundy, steel, skin],
  [green, teal, steel, tan],
  [blue, navy, mint, skin],
  [pink, purple, steel, tan],
] as const;
const helmets = { gold, blue, pink };

function bicycle(tile: Tile, x: number, frameColor: number) {
  tile.rect(x + 1, 3, 3, 19, ink, 90);
  tile.bevel(x - 2, 1, 4, 7, ink);
  tile.bevel(x - 2, 16, 4, 7, ink);
  tile.rect(x - 1, 2, 1, 4, gray);
  tile.rect(x - 1, 18, 1, 4, gray);
  tile.rect(x - 1, 6, 2, 12, frameColor);
  tile.rect(x - 4, 6, 8, 2, ink);
  tile.rect(x - 3, 6, 6, 1, steel);
  tile.rect(x - 2, 13, 4, 3, ink);
  tile.rect(x - 1, 3, 2, 1, steel);
  tile.rect(x - 1, 20, 2, 1, burgundy);
}

const steps = [2, 1, -2, -1] as const;

function drawRider(tile: Tile, pose: number, palette: number, helmet: number) {
  const [shirt, shade, frame, complexion] = riderPaint[palette]!;
  const walking = pose >= 24 && pose < 28;
  const dismounting = pose >= 28;
  if (walking || dismounting) {
    const bikeX = walking ? 8 : pose === 28 ? 11 : 9;
    bicycle(tile, bikeX, frame);
    const body = walking ? 16 : pose === 28 ? 13 : 15;
    const step = walking ? steps[pose % 4]! : 1;
    tile.bevel(body - 3, 9, 7, 10, ink);
    tile.rect(body - 2, 14 - step, 2, 4, navy);
    tile.rect(body + 1, 14 + step, 2, 4, navy);
    tile.rect(body - 2, 17 - step, 2, 1, steel);
    tile.rect(body + 1, 17 + step, 2, 1, steel);
    tile.bevel(body - 3, 9, 7, 6, shirt);
    tile.line(body - 2, 10, bikeX + 3, 7, shade, 2);
    tile.rect(bikeX + 3, 7, 2, 2, complexion);
    tile.bevel(body - 2, 6, 5, 6, ink);
    tile.bevel(body - 2, 6, 4, 4, helmet);
    tile.rect(body - 1, 6, 2, 1, white);
    return;
  }
  bicycle(tile, 12, frame);
  const step = steps[pose % 4]!;
  tile.rect(8, 13 + step, 3, 4, ink);
  tile.rect(13, 13 - step, 3, 4, ink);
  tile.rect(9, 14 + step, 2, 2, navy);
  tile.rect(13, 14 - step, 2, 2, navy);
  tile.rect(8, 16 + step, 2, 1, steel);
  tile.rect(14, 16 - step, 2, 1, steel);
  tile.bevel(7, 8, 10, 7, ink);
  tile.bevel(8, 9, 8, 5, shirt);
  tile.bevel(9, 11, 6, 4, shade);
  tile.rect(10, 13, 4, 1, gold);
  const action = Math.floor((pose % 12) / 4);
  for (const side of [-1, 1]) {
    const shoulder = side < 0 ? 8 : 14;
    const hand = side < 0 ? 8 : 14;
    if (action === (side < 0 ? 1 : 2)) {
      const end = side < 0 ? 1 : 20;
      tile.line(shoulder, 9, end, 9, ink, 3);
      tile.line(shoulder, 9, end, 9, shirt, 2);
      tile.rect(end, 9, 2, 2, complexion);
    } else {
      tile.line(shoulder, 10, hand, 6, shade, 2);
      tile.rect(hand, 6, 2, 2, complexion);
    }
  }
  const looking = pose >= 12;
  const headX = looking ? 8 : 9;
  tile.bevel(headX, 5, 6, 7, ink);
  tile.bevel(headX + 1, 5, 5, 5, helmet);
  tile.rect(
    headX + (looking ? 0 : 2),
    looking ? 9 : 8,
    looking ? 2 : 1,
    looking ? 2 : 1,
    complexion,
  );
  tile.rect(headX + 2, 5, 2, 1, white);
  tile.rect(headX + 3, 7, 2, 1, shadow);
}

const walkers = [
  [gold, navy, skin, brown],
  [blue, navy, tan, ink],
  [purple, shadow, skin, steel],
  [green, navy, skin, brown],
  [orange, teal, tan, gold],
  [pink, navy, skin, ink],
  [royal, shadow, tan, ink],
  [teal, navy, tan, brown],
] as const;

function drawPedestrian(tile: Tile, row: number) {
  const kind = pedestrianTypes[Math.floor(row / 4)]!;
  const [shirt, trousers, complexion, hair] = walkers[Math.floor(row / 4)]!;
  const step = steps[row % 4]!;
  const x = kind === 'dog' ? 5 : 8;
  const y = kind === 'stroller' || kind === 'child' ? 8 : 6;
  tile.rect(x - 2, y + 4, 6, 4, ink, 93);
  const stride = kind === 'runner' ? step + Math.sign(step) : step;
  tile.rect(x - 2, y + 4 + stride, 2, 3, trousers);
  tile.rect(x + 1, y + 4 - stride, 2, 3, trousers);
  tile.rect(x - 2, y + 4 + stride, 2, 1, white);
  tile.rect(x + 1, y + 4 - stride, 2, 1, white);
  tile.bevel(x - 4, y, 8, 6, ink);
  tile.bevel(x - 3, y + 1, 6, 4, shirt);
  tile.rect(x - 4, y + 2 - Math.sign(step), 2, 2, complexion);
  tile.rect(x + 2, y + 2 + Math.sign(step), 2, 2, complexion);
  tile.bevel(x - 3, y - 3, 6, 6, ink);
  tile.bevel(x - 2, y - 3, 4, 4, hair);
  tile.rect(x - 2, y, 4, 1, complexion);
  if (kind === 'child' || kind === 'runner')
    tile.rect(x - 2, y - 2, 4, 1, white);
  if (kind === 'student' || kind === 'child')
    tile.bevel(x - 2, y + 2, 4, 4, kind === 'child' ? royal : gold);
  if (kind === 'senior') {
    tile.line(12, 5 + Math.sign(step), 13, 10 + Math.sign(step), brown);
    tile.rect(12, 5 + Math.sign(step), 2, 1, steel);
  }
  if (kind === 'stroller') {
    tile.rect(4, 2, 8, 5, ink);
    tile.bevel(5, 1, 6, 6, teal);
    tile.rect(6, 3, 4, 2, cream);
    tile.rect(6, 7, 4, 1, steel);
  }
  if (kind === 'tourist') {
    tile.rect(10, 3, 4, 4, white);
    tile.line(10, 4, 13, 5, green);
    tile.rect(11, 6, 2, 1, blue);
  }
  if (kind === 'dog') {
    tile.line(7, 7, 12, 5, steel);
    tile.bevel(11, 3, 4, 6, brown);
    tile.rect(12, 3, 2, 2, cream);
    tile.rect(11 + Math.sign(step), 8, 1, 2, ink);
  }
}

const carPaint = [
  [blue, royal, cyan],
  [burgundy, purple, orange],
  [green, teal, mint],
  [steel, gray, white],
  [gold, brown, cream],
] as const;
type Body =
  | (typeof smallVehicleTypes)[number]
  | (typeof largeVehicleTypes)[number]
  | (typeof emergencyTypes)[number];
const bodyStyles = {
  hatchback: [4, 41, 11, 8, 1],
  sedan: [3, 42, 11, 11, 5],
  estate: [2, 44, 11, 15, 2],
  taxi: [3, 42, 11, 11, 5],
  van: [6, 51, 12, 31, 2],
  bus: [5, 54, 13, 38, 2],
  ambulance: [9, 46, 11, 25, 2],
  fire: [7, 50, 13, 28, 2],
  police: [13, 37, 11, 12, 5],
} as const;

function glass(
  tile: Tile,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  tile.bevel(x, y, width, height, navy);
  tile.line(x + 1, y + height - 2, x + width - 3, y + 1, gray);
  tile.rect(x + width - 6, y + 1, 3, 1, cyan);
}

function drawVehicle(
  tile: Tile,
  type: Body,
  paint: number,
  lamps: number,
  beacon = 0,
) {
  const [top, length, half, roofLength, trunk] = bodyStyles[type];
  const [color, shade, highlight] = carPaint[paint]!;
  const left = 16 - half;
  const right = 15 + half;
  const bottom = top + length - 1;
  const wide = half * 2;
  const bus = type === 'bus';
  const high = bus || type === 'van' || type === 'ambulance' || type === 'fire';
  const windscreen = top + (high ? 4 : 8);
  const roofTop = windscreen + 6;
  tile.bevel(left + 3, top + 3, wide, length, shadow);
  tile.rect(left - 1, top + 6, 3, 7, ink);
  tile.rect(right - 1, top + 6, 3, 7, ink);
  tile.rect(left - 1, bottom - 11, 3, 8, ink);
  tile.rect(right - 1, bottom - 11, 3, 8, ink);
  tile.bevel(left, top, wide, length, ink);
  tile.bevel(left + 1, top + 1, wide - 2, length - 2, shade);
  tile.bevel(left + 2, top + 1, wide - 5, length - 4, color);
  tile.rect(left + 3, top + 4, wide - 6, 1, highlight);
  tile.rect(left + 2, roofTop, 1, roofLength, highlight);
  glass(tile, left + 3, windscreen, wide - 6, 6);
  tile.rect(left - 2, windscreen + 3, 3, 2, ink);
  tile.rect(right, windscreen + 3, 3, 2, ink);
  tile.rect(left + 2, windscreen + 6, 2, roofLength - 2, navy);
  tile.rect(right - 3, windscreen + 6, 2, roofLength - 2, navy);
  if (high) {
    for (let y = roofTop + 3; y < roofTop + roofLength - 2; y += 7) {
      tile.rect(left + 2, y, 2, 1, bus ? cyan : highlight);
      tile.rect(right - 3, y, 2, 1, bus ? cyan : highlight);
    }
    tile.bevel(left + 6, roofTop + 6, wide - 12, 8, shade);
    tile.rect(left + 7, roofTop + 8, wide - 14, 1, highlight);
    tile.rect(left + 7, roofTop + 11, wide - 14, 1, highlight);
  }
  if (!high || bus) glass(tile, left + 3, bottom - trunk - 6, wide - 6, 5);
  if (type === 'taxi') {
    tile.rect(12, roofTop + 3, 8, 5, ink);
    tile.rect(13, roofTop + 4, 6, 3, white);
    tile.rect(13, roofTop + 5, 2, 2, amber);
  }
  if (type === 'fire' || type === 'ambulance' || type === 'police') {
    tile.rect(left + 1, bottom - 14, 3, 8, type === 'police' ? royal : red);
    tile.rect(right - 3, bottom - 14, 3, 8, type === 'police' ? royal : red);
    const bar = roofTop + 1;
    tile.rect(8, bar, 16, 5, ink);
    tile.rect(9, bar + 1, 5, 3, beacon === 1 ? cyan : royal);
    tile.rect(18, bar + 1, 5, 3, beacon === 2 ? cyan : royal);
    if (beacon !== 0) tile.rect(beacon === 1 ? 7 : 23, bar + 2, 2, 1, white);
  }
  tile.rect(left + 2, top + 2, 4, 2, cream);
  tile.rect(right - 5, top + 2, 4, 2, cream);
  tile.rect(13, bottom - 2, 6, 1, steel);
  const stop = lamps >= 3;
  tile.rect(left + 2, bottom - 4, 4, 3, stop ? red : burgundy);
  tile.rect(right - 5, bottom - 4, 4, 3, stop ? red : burgundy);
  if (stop) tile.rect(14, bottom - 5, 4, 1, red);
  const indicator = lamps % 3;
  if (indicator !== 0) {
    const x = indicator === 1 ? left + 1 : right - 3;
    tile.rect(x, top + 4, 3, 3, amber);
    tile.rect(x, bottom - 3, 3, 3, amber);
    tile.rect(x + 1, top + 4, 1, 1, gold);
    tile.rect(x + 1, bottom - 2, 1, 1, gold);
  }
}

function drawTram(tile: Tile, city: number, section: number) {
  const [body, stripe, shade] =
    city === 0 ? [burgundy, gold, red] : [royal, cream, blue];
  const front = section === 0;
  const top = front ? 1 : 0;
  const end = front ? 79 : 78;
  tile.bevel(5, top, 25, end - top + 1, shadow);
  tile.bevel(3, top, 26, end - top + 1, ink);
  tile.bevel(4, top + 1, 24, end - top - 1, body);
  tile.rect(5, top + 3, 3, end - top - 5, stripe);
  tile.rect(24, top + 3, 3, end - top - 5, stripe);
  tile.rect(9, top + 6, 14, end - top - 11, shade);
  for (let y = 15; y < 67; y += 9) {
    tile.rect(6, y, 4, 5, navy);
    tile.rect(22, y, 4, 5, navy);
    tile.rect(6, y, 2, 1, cyan);
    tile.rect(24, y, 2, 1, cyan);
  }
  glass(tile, 7, front ? 5 : 68, 18, 7);
  tile.rect(7, front ? 3 : 75, 3, 2, front ? white : red);
  tile.rect(22, front ? 3 : 75, 3, 2, front ? white : red);
  tile.bevel(11, 24, 10, 11, steel);
  tile.rect(13, 26, 6, 2, gray);
  tile.rect(13, 30, 6, 2, gray);
  if (!front) {
    tile.line(11, 47, 18, 58, ink, 2);
    tile.line(19, 47, 12, 58, ink, 2);
    tile.rect(10, 46, 12, 2, steel);
    tile.rect(11, 59, 10, 2, steel);
  }
  const joint = front ? 74 : 0;
  tile.rect(8, joint, 16, 6, ink);
  for (let x = 9; x <= 22; x += 2) tile.rect(x, joint, 1, 6, gray);
}

export function encodeSprite(png: PNG) {
  // Raw palette-color runs compress better than prediction filters on these atlases.
  return PNG.sync.write(png, {
    filterType: 0,
    deflateLevel: 9,
    deflateStrategy: 0,
  });
}

export function spriteArt() {
  return {
    rider: sheet(
      'rider',
      (t, row) =>
        drawRider(
          t,
          row % riderPoses,
          0,
          helmets[helmetColors[Math.floor(row / riderPoses)]!],
        ),
      riderDirections,
    ),
    'rider-lights': sheet(
      'rider-lights',
      (t, row) => {
        const x = [12, 8, 11, 9][Math.floor(row / 4)]!;
        if (row & 1) {
          t.rect(x - 1, 2, 2, 2, white);
          t.rect(x - 1, 19, 2, 2, red);
        }
        if (row & 2) t.rect(x - 2, 21, 4, 1, orange);
      },
      riderDirections,
    ),
    'traffic-cyclist': sheet(
      'traffic-cyclist',
      (t, row) =>
        drawRider(
          t,
          row % 4,
          1 + Math.floor(row / 4),
          [white, mint, gold][Math.floor(row / 4)]!,
        ),
      riderDirections,
    ),
    'traffic-pedestrian': sheet(
      'traffic-pedestrian',
      drawPedestrian,
      pedestrianDirections,
    ),
    'traffic-car': sheet('traffic-car', (t, row, column) => {
      const type = smallVehicleTypes[Math.floor(row / vehiclePaints)]!;
      drawVehicle(
        t,
        type,
        type === 'taxi' ? [4, 3, 1][row % vehiclePaints]! : row % vehiclePaints,
        column,
      );
    }),
    'traffic-large': sheet('traffic-large', (t, row, column) =>
      drawVehicle(
        t,
        largeVehicleTypes[Math.floor(row / vehiclePaints)]!,
        [3, 0, 4][row % vehiclePaints]!,
        column,
      ),
    ),
    'traffic-emergency': sheet('traffic-emergency', (t, row, column) =>
      drawVehicle(t, emergencyTypes[row]!, row === 1 ? 1 : 3, 0, column),
    ),
    'traffic-tram': sheet('traffic-tram', drawTram),
  };
}
