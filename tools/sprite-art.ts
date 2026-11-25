import { PNG } from 'pngjs';
import { PixelTile } from '../src/render/PixelTile.ts';
import {
  cyclistVariants,
  emergencyTypes,
  helmetColors,
  largeVehicleTypes,
  pedalFrames,
  pedestrianSeasonRows,
  pedestrianTypes,
  ridingPoses,
  signalStages,
  walkFrames,
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

export class Tile extends PixelTile<PNG> {
  constructor(width: number, height: number) {
    super(new PNG({ width, height }));
  }
}

type Paint = (tile: Tile, row: number, column: number) => void;

function sheet(id: SpriteSheet, paint: Paint, directions = 0) {
  const [width, height, columns, rows] = spriteSheets[id];
  const result = new PNG({ width: width * columns, height: height * rows });
  if (directions) {
    const poses =
      id === 'rider'
        ? riderPoses * helmetColors.length
        : (rows * columns) / directions;
    for (let row = 0; row < poses; row++) {
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
            result.data[to] = tile.image.data[from]!;
            result.data[to + 1] = tile.image.data[from + 1]!;
            result.data[to + 2] = tile.image.data[from + 2]!;
            result.data[to + 3] = tile.image.data[from + 3]!;
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
  [burgundy, orange, gold, steel, skin],
  [teal, green, mint, steel, tan],
  [navy, blue, cyan, mint, skin],
  [purple, pink, cream, steel, tan],
] as const;
const helmets = { gold, blue, pink };
const helmetShade = new Map([
  [gold, amber],
  [blue, royal],
  [pink, burgundy],
  [white, steel],
  [mint, green],
]);

function bicycle(tile: Tile, x: number, frameColor: number) {
  tile.oval(x - 1, 5, 6, 23, ink, 92);
  for (const y of [5, 20]) {
    tile.bevel(x - 2, y, 5, 7, ink);
    tile.rect(x, y + 1, 2, 5, shadow);
    tile.rect(x, y + 2, 1, 3, gray);
  }
  tile.rect(x - 1, 8, 3, 16, ink);
  tile.rect(x, 8, 1, 16, frameColor);
  tile.rect(x - 5, 8, 11, 3, ink);
  tile.rect(x - 4, 8, 9, 1, steel);
  tile.bevel(x - 2, 17, 5, 5, ink);
  tile.rect(x - 1, 17, 3, 2, gray);
  tile.rect(x, 6, 1, 2, steel);
  tile.rect(x - 1, 24, 3, 1, burgundy);
}

// Foot positions through one crank revolution. The second component
// widens the knee as it rises, keeping the legs recognizable from above.
const crank = [
  [3, 0],
  [2, 1],
  [-2, 1],
  [-3, 0],
  [-2, -1],
  [2, -1],
] as const;
const gait = [
  [3, 0],
  [2, 1],
  [-1, 2],
  [-3, 0],
  [-2, 1],
  [1, 2],
] as const;

function riderLayout(pose: number) {
  const walking = pose >= ridingPoses && pose < ridingPoses + walkFrames;
  const dismount = pose - ridingPoses - walkFrames;
  return {
    walking,
    dismount,
    bikeX: walking ? 10 : dismount >= 0 ? 14 - 3 * dismount : 16,
    bodyX: walking ? 21 : dismount >= 0 ? 18 + 2 * dismount : 16,
  };
}

function drawRider(tile: Tile, pose: number, palette: number, helmet: number) {
  const [shade, shirt, bright, frame, complexion] = riderPaint[palette]!;
  const { walking, dismount, bikeX, bodyX } = riderLayout(pose);
  const onFoot = walking || dismount >= 0;
  const cycle = walking
    ? (pose - ridingPoses) % walkFrames
    : pose % pedalFrames;
  const signal = onFoot
    ? 0
    : (Math.floor(pose / pedalFrames) % signalStages) - 2;
  const look = onFoot ? 0 : Math.floor(pose / (pedalFrames * signalStages));
  bicycle(tile, bikeX, frame);
  for (const side of [-1, 1]) {
    const stride = (walking ? gait : crank)[
      (cycle + (side === 1 ? 3 : 0)) % pedalFrames
    ]!;
    const footY = 21 + stride[0];
    const hip = bodyX + side * 2;
    const knee = hip + side * (onFoot ? 1 : 2 + stride[1]);
    tile.stroke(hip, 17, knee, footY - 1, 2.1, ink);
    tile.stroke(hip, 17, knee, footY - 1, 1.25, navy);
    tile.line(hip, 17, knee, footY - 1, royal);
    tile.oval(knee - 1, footY - 1, 4, 4, ink);
    tile.rect(knee, footY, 2, 1, steel);
  }
  const build = [0, 1, -1, 0][palette]!;
  tile.oval(bodyX - 5 - build, 11, 11 + build * 2, 9, ink);
  tile.oval(bodyX - 4 - build, 12, 9 + build * 2, 7, shade);
  tile.oval(bodyX - 4 - build, 11, 8 + build * 2, 6, shirt);
  tile.line(bodyX - 3, 13, bodyX - 1, 12, bright);
  tile.rect(bodyX - 1, 17, 4, 1, shade);
  for (const side of [-1, 1]) {
    const shoulder = bodyX + side * (4 + build);
    const reach = Math.sign(signal) === side ? Math.abs(signal) : 0;
    const holdingBike = !onFoot || side < 0;
    const handX = reach
      ? bodyX + side * (reach === 2 ? 12 : 8)
      : holdingBike
        ? bikeX + side * (onFoot ? -5 : 4)
        : bodyX + 5;
    const handY = reach === 2 ? 13 : reach === 1 ? 10 : holdingBike ? 9 : 17;
    const elbowX = reach === 2 ? bodyX + side * 8 : shoulder + side;
    const elbowY = reach === 2 ? 13 : holdingBike ? 11 : 15;
    tile.stroke(shoulder, 13, elbowX, elbowY, 2.1, ink);
    tile.stroke(elbowX, elbowY, handX, handY, 2.1, ink);
    tile.stroke(shoulder, 13, elbowX, elbowY, 1.3, shade);
    tile.stroke(elbowX, elbowY, handX, handY, 1.3, shirt);
    tile.line(shoulder, 12, elbowX, elbowY - 1, shirt);
    tile.oval(handX - 1, handY - 1, 3, 3, complexion);
    tile.rect(handX, handY + 1, 1, 1, tan);
  }
  if (palette !== 0) {
    tile.bevel(bodyX - 3, 15, 7, 5, ink);
    tile.bevel(bodyX - 2, 15, 5, 4, shade);
    tile.rect(bodyX - 1, 16, 3, 1, bright);
  }
  const headX = bodyX - look;
  const y = onFoot ? 7 : 6 + look;
  tile.oval(headX - 4, y, 9, 9, ink);
  tile.oval(headX - 3, y + 1, 7, 7, helmetShade.get(helmet) ?? amber);
  tile.oval(headX - 3, y, 6, 6, helmet);
  tile.line(headX - 2, y + 2, headX, y + 1, white);
  tile.line(headX + 1, y + 3, headX + 2, y + 3 - look, shadow);
  tile.line(headX, y + 5, headX + 1, y + 5 - look, shadow);
  if (look) {
    tile.rect(headX - 3, y + 5, 2, look, complexion);
    tile.rect(headX - 2, y + 5, 1, 1, shade);
  }
}

const walkers = [
  [5, 5, burgundy, orange, gold, navy, skin, brown],
  [7, 7, royal, blue, cyan, navy, tan, ink],
  [6, 7, purple, burgundy, pink, shadow, skin, steel],
  [7, 7, teal, green, mint, navy, skin, brown],
  [8, 7, brown, orange, cream, teal, tan, gold],
  [6, 7, purple, pink, cream, navy, skin, ink],
  [7, 7, navy, royal, blue, shadow, tan, ink],
  [6, 6, teal, green, mint, navy, tan, brown],
  [7, 7, burgundy, orange, gold, navy, skin, shadow],
  [8, 8, navy, blue, cyan, shadow, tan, brown],
  [8, 7, teal, green, mint, navy, skin, ink],
  [6, 6, purple, burgundy, pink, navy, tan, gold],
] as const;

function drawPedestrian(tile: Tile, row: number) {
  const winter = row >= pedestrianSeasonRows;
  const index = Math.floor((row % pedestrianSeasonRows) / walkFrames);
  const kind = pedestrianTypes[index]!;
  const [width, length, shade, shirt, bright, trousers, complexion, hair] =
    walkers[index]!;
  const phase = row % walkFrames;
  const x = kind === 'dog' ? 8 : 12;
  const y = kind === 'stroller' ? 14 : kind === 'child' ? 12 : 10;
  const seated = kind === 'wheelchair';
  const coat = width + Number(winter) * 2;
  const half = (coat - 1) / 2;
  tile.oval(x - 4, y - 1, 10, 11, ink, 80);
  if (seated) {
    tile.bevel(x - 6, y - 2, 13, 12, ink);
    tile.rect(x - 4, y, 9, 8, gray);
    tile.rect(x - 4, y + 1, 9, 6, teal);
    for (const side of [-1, 1]) {
      const wheel = x + side * 5;
      tile.oval(wheel - 1, y - 2, 3, 12, ink);
      tile.rect(wheel, y - 1, 1, 9, steel);
      tile.rect(
        wheel,
        y + ((phase + 3 * Number(side > 0)) % walkFrames),
        1,
        2,
        gray,
      );
      tile.rect(wheel - side, y - 4, 1, 2, ink);
    }
    tile.rect(x - 3, y - 3, 7, 2, shadow);
  }
  for (const side of [-1, 1]) {
    const step = gait[(phase + (side === 1 ? 3 : 0)) % walkFrames]!;
    const legX = x + side * (width > 6 ? 2 : 1.5);
    const stepLength = kind === 'runner' ? 1.3 : kind === 'stroller' ? 0.75 : 1;
    const footY = seated ? y - 4 : y + length / 2 + 3 + step[0] * stepLength;
    const shoeX = legX + side * (seated ? 0 : step[1] * 0.35);
    tile.stroke(legX, y + 2, shoeX, footY, 1.6, ink);
    tile.stroke(legX, y + 2, shoeX, footY, 0.9, trousers);
    tile.oval(shoeX - 1.25, footY - 1.5, 3.5, 3, ink);
    tile.oval(shoeX - 0.75, footY - 1.5, 2, 1.5, steel);
  }
  tile.oval(x - half - 1, y - 2, coat + 2, length + 1, ink);
  tile.oval(x - half, y - 1, coat, length - 1, shade);
  tile.oval(x - half, y - 1, coat - 1, length - 2, shirt);
  tile.stroke(x - half + 1, y + 1, x - 1, y - 0.5, 0.75, bright);
  for (const side of [-1, 1]) {
    const step = gait[(phase + (side === 1 ? 3 : 0)) % walkFrames]!;
    const shoulder = x + side * half;
    const handX = shoulder + side;
    const handY =
      kind === 'stroller'
        ? y - 5
        : kind === 'tourist' && side > 0
          ? y - 3
          : seated
            ? y + step[0]
            : y + 1 - step[0] * 0.8;
    tile.stroke(shoulder, y + 1, handX, handY, winter ? 1.7 : 1.45, ink);
    tile.stroke(shoulder, y + 1, handX, handY, winter ? 1.05 : 0.7, shade);
    tile.oval(
      handX - 0.75,
      handY - 0.75,
      2.5,
      2.5,
      winter ? shadow : complexion,
    );
  }
  if (kind === 'student' || kind === 'child' || kind === 'commuter') {
    const bag = kind === 'child' ? royal : kind === 'commuter' ? brown : gold;
    tile.oval(x - 2, y + 2, 6, 5, ink);
    tile.oval(x - 2, y + 2, 5, 4, bag);
    tile.rect(x - 1, y + 3, 2, 1, bright);
  }
  if (winter) {
    tile.oval(x - 3, y - 3, 7, 6, ink);
    tile.oval(x - 2, y - 2, 5, 5, bright);
    tile.rect(x, y + 1, 2, 3, bright);
  }
  const headY = y - (seated ? 4 : 5);
  tile.oval(x - 3, headY, 7, 7, ink);
  tile.oval(x - 2, headY, 5, 6, winter ? shade : hair);
  tile.oval(x - 2, headY + 3, 5, 3, complexion);
  tile.rect(x - 1, headY + 3, 2, 1, skin);
  tile.rect(x + 2, headY + 4, 1, 1, tan);
  if (winter) tile.rect(x - 1, headY + 1, 3, 1, shirt);
  else if (kind === 'senior') tile.rect(x - 1, headY + 1, 3, 1, white);
  else if (kind === 'runner') tile.rect(x - 2, headY + 2, 5, 1, bright);
  if (seated) {
    tile.rect(x - 2, y - 6, 5, 1, shadow);
    tile.rect(x - 2, y - 5, 5, 1, gray);
  }
  if (kind === 'stroller') {
    for (const wheel of [x - 4, x + 4]) {
      tile.bevel(wheel - 1, 3, 3, 6, ink);
      tile.rect(wheel, 4 + (phase % 2), 1, 3, gray);
    }
    tile.bevel(x - 4, 1, 9, 9, ink);
    tile.oval(x - 3, 2, 7, 7, teal);
    tile.oval(x - 3, 2, 6, 5, green);
    tile.rect(x - 2, 6, 5, 2, cream);
    tile.rect(x - 3, 9, 7, 1, steel);
  }
  if (kind === 'tourist') {
    tile.rect(x + 3, y - 6, 6, 5, ink);
    tile.rect(x + 3, y - 6, 5, 4, cream);
    tile.line(x + 4, y - 4, x + 7, y - 5, green);
    tile.rect(x + 5, y - 5, 1, 3, blue);
  }
  if (kind === 'shopper') {
    tile.bevel(x + 4, y + 1 + (phase % 2), 5, 5, ink);
    tile.bevel(x + 5, y + 2 + (phase % 2), 4, 4, cream);
    tile.rect(x + 6, y + 3 + (phase % 2), 2, 1, brown);
  }
  if (kind === 'dog') {
    const dogX = 17;
    const dogY = 5 + Math.round(gait[phase]![0] / 3);
    tile.line(x + 4, y + 1, dogX - 1, dogY + 5, steel);
    tile.line(dogX + 2, dogY + 7, dogX + 3 + (phase % 2), dogY + 9, ink);
    for (const side of [-1, 1]) {
      const paw = dogX + side * 2;
      tile.rect(paw, dogY + 2 + ((phase + side + 1) % 2), 2, 2, ink);
      tile.rect(paw, dogY + 5 + ((phase + side + 2) % 2), 2, 2, brown);
    }
    tile.oval(dogX - 2, dogY, 6, 8, ink);
    tile.oval(dogX - 1, dogY + 1, 4, 6, brown);
    tile.rect(dogX, dogY + 3, 2, 1, tan);
    tile.bevel(dogX - 2, dogY - 2, 5, 4, brown);
    tile.rect(dogX, dogY - 2, 1, 2, cream);
    tile.rect(dogX - 1, dogY + 1, 4, 1, burgundy);
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
  tractor: [8, 47, 13, 28, 2],
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
  if (type === 'tractor') {
    tile.bevel(7, 13, 20, 43, shadow);
    for (const x of [3, 23]) {
      tile.bevel(x, 14, 6, 11, ink);
      tile.bevel(x - 2, 35, 9, 19, ink);
      for (let y = 37; y < 52; y += 4) tile.rect(x - 1, y, 7, 1, shade);
    }
    tile.bevel(9, 11, 14, 24, shade);
    tile.bevel(10, 12, 12, 21, color);
    tile.rect(13, 13, 6, 11, highlight);
    tile.rect(20, 21, 3, 6, ink);
    tile.bevel(7, 32, 18, 20, color);
    glass(tile, 9, 33, 14, 8);
    tile.bevel(9, 41, 14, 8, shade);
    tile.rect(9, 51, 3, 2, lamps >= 3 ? red : burgundy);
    tile.rect(20, 51, 3, 2, lamps >= 3 ? red : burgundy);
    tile.rect(10, 13, 3, 2, cream);
    tile.rect(19, 13, 3, 2, cream);
    return;
  }
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
  const colors = [
    [burgundy, gold, red],
    [royal, cream, blue],
    [gray, steel, ink],
  ] as const;
  const [body, stripe, shade] = colors[city]!;
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
        const mode = Math.floor((row % 16) / 4);
        const pose = [0, ridingPoses, ridingPoses + walkFrames, riderPoses - 1][
          mode
        ]!;
        const { bikeX, bodyX } = riderLayout(pose);
        if (row & 1) {
          t.rect(bikeX - 1, 6, 3, 2, white);
          t.rect(bikeX - 1, 23, 3, 2, red);
        }
        if (row & 2) t.rect(bikeX - 2, 25, 5, 1, red);
        if (row & 16) {
          t.rect(bodyX - 3, 16, 7, 2, amber);
          t.rect(bodyX - 2, 17, 5, 1, row & 2 ? white : gold);
        }
      },
      riderDirections,
    ),
    'traffic-cyclist': sheet(
      'traffic-cyclist',
      (t, row) => {
        const body = Math.floor(row / pedalFrames);
        const pose = 2 * pedalFrames + (row % pedalFrames);
        if (body < cyclistVariants) {
          drawRider(t, pose, 1 + body, [white, mint, gold][body]!);
          return;
        }
        const rickshaw = body === cyclistVariants;
        drawRider(t, pose, rickshaw ? 1 : 3, cream);
        if (rickshaw) {
          for (const x of [7, 21]) t.bevel(x, 23, 4, 8, ink);
          t.bevel(8, 25, 16, 7, ink);
          t.bevel(9, 26, 14, 5, teal);
          t.rect(11, 27, 10, 2, mint);
          t.rect(11, 29, 10, 1, cream);
        } else {
          t.bevel(15, 0, 3, 5, ink);
          t.bevel(11, 2, 11, 9, ink);
          t.bevel(12, 3, 9, 7, brown);
          t.rect(13, 4, 7, 2, gold);
          t.rect(15, 3, 2, 6, cream);
        }
      },
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
        (largeVehicleTypes[Math.floor(row / vehiclePaints)] === 'tractor'
          ? [2, 4, 3]
          : [3, 0, 4])[row % vehiclePaints]!,
        column,
      ),
    ),
    'traffic-emergency': sheet('traffic-emergency', (t, row, column) =>
      drawVehicle(t, emergencyTypes[row]!, row === 1 ? 1 : 3, 0, column),
    ),
    'traffic-tram': sheet('traffic-tram', drawTram),
  };
}
