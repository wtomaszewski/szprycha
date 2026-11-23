import { PNG } from 'pngjs';
import {
  artHash,
  BALL_FRAME,
  corners,
  propKinds,
  roofDetails,
  roofKinds,
  TILE,
  TILE_COLUMNS,
  TILE_COUNT,
  tiles,
  wallKinds,
} from '../src/render/artFrames.ts';

const ink = '#1a1c2c';
const dark = '#333c57';
const asphalt = '#566c86';
const concrete = '#94b0c2';
const steel = '#c0cbdc';
const stone = '#c2c3c7';
const white = '#f4f4f4';
const grass = '#38b764';
const leaf = '#3e8948';
const teal = '#257179';
const lime = '#a7f070';
const wood = '#b86f50';
const earth = '#5a3a2e';
const brick = '#a65e46';
const red = '#b13e53';
const sand = '#e8c39e';
const cream = '#f0dca8';
const gold = '#ffcd75';
const cyan = '#73eff7';
const sky = '#41a6f6';
const blue = '#3b5dc9';
const copper = '#6ab08a';

class Frame {
  constructor(
    readonly png: PNG,
    readonly x: number,
    readonly y: number,
    readonly width: number,
    readonly height: number,
  ) {}

  dot(x: number, y: number, color: string, alpha = 255) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const at = ((this.y + y) * this.png.width + this.x + x) * 4;
    this.png.data.writeUIntBE(Number.parseInt(color.slice(1), 16), at, 3);
    this.png.data[at + 3] = alpha;
  }

  box(x: number, y: number, w: number, h: number, color: string, alpha = 255) {
    for (let j = Math.max(0, y); j < Math.min(y + h, this.height); j++)
      for (let i = Math.max(0, x); i < Math.min(x + w, this.width); i++)
        this.dot(i, j, color, alpha);
  }

  oval(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    color: string,
    alpha = 255,
  ) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1)
          this.dot(x, y, color, alpha);
  }

  line(
    x: number,
    y: number,
    toX: number,
    toY: number,
    color: string,
    width = 1,
  ) {
    const steps = Math.max(Math.abs(toX - x), Math.abs(toY - y));
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i / steps : 0;
      this.box(
        Math.round(x + (toX - x) * t),
        Math.round(y + (toY - y) * t),
        width,
        width,
        color,
      );
    }
  }
}

function drawTerrain(sheet: PNG, seed: number) {
  const tile = (gid: number) =>
    new Frame(
      sheet,
      ((gid - 1) % TILE_COLUMNS) * TILE,
      Math.floor((gid - 1) / TILE_COLUMNS) * TILE,
      TILE,
      TILE,
    );
  const noise = (
    frame: Frame,
    id: number,
    color: string,
    count: number,
    width = 1,
  ) => {
    for (let i = 0; i < count; i++) {
      const n = artHash(id, i, seed);
      frame.box(n & 31, (n >>> 5) & 31, width, 1, color);
    }
  };

  tiles.grassVariants.forEach((gid, variant) => {
    const f = tile(gid);
    f.box(0, 0, 32, 32, grass);
    noise(f, gid, leaf, 9, 2);
    for (let i = 0; i < 4; i++) {
      const n = artHash(gid, i, seed + 1);
      const x = 2 + (n % 27);
      const y = 2 + ((n >>> 8) % 27);
      f.line(x, y, x + 2, y + 2, leaf);
      f.box(x + 2, y - 1, 1, 3, leaf);
      if (i % 2 === 0) f.dot(x, y - 1, lime);
      if (variant === 3 && i < 3) {
        f.dot(x + 2, y - 2, '#ff77a8');
        f.dot(x + 3, y - 2, cream);
      }
    }
  });

  [...tiles.asphaltVariants, tiles.asphaltDrain].forEach((gid, variant) => {
    const f = tile(gid);
    f.box(0, 0, 32, 32, dark);
    noise(f, gid, ink, 9);
    noise(f, gid + 100, asphalt, 13);
    if (variant === 4) {
      f.oval(19, 20, 8, 7, ink);
      f.oval(18, 19, 7, 6, asphalt);
      f.oval(19, 20, 6, 5, dark);
      for (let y = 17; y < 24; y += 2) {
        f.box(15, y, 8, 1, ink);
        f.box(16, y + 1, 5, 1, asphalt);
      }
      f.dot(14, 16, concrete);
    } else if (variant === 1) {
      f.box(11, 12, 12, 7, asphalt, 65);
      f.line(8, 13, 11, 10, asphalt);
      f.line(11, 10, 22, 10, asphalt);
      f.line(22, 10, 25, 14, asphalt);
      f.line(25, 14, 24, 19, ink);
      f.line(24, 19, 13, 21, ink);
      f.line(13, 21, 9, 18, ink);
    } else if (variant === 2) {
      f.line(8, 13, 14, 14, ink);
      f.line(14, 14, 19, 19, ink);
      f.line(19, 19, 26, 18, ink);
      f.line(19, 19, 20, 23, ink);
    } else if (variant === 3) {
      for (let i = 0; i < 32; i++) {
        const offset = artHash(gid, i, seed) & 1;
        if ((i + offset) % 3 !== 0) f.dot(i, 7 + offset, ink);
        if ((i - offset) % 3 !== 0) f.dot(i, 24 - offset, ink);
      }
    }
  });

  [...tiles.sidewalkVariants, tiles.sidewalkLeaves].forEach((gid, variant) => {
    const f = tile(gid);
    f.box(0, 0, 32, 32, asphalt);
    for (let y = 0; y < 32; y += 16)
      for (let x = 0; x < 32; x += 16) {
        f.box(x, y, 15, 15, concrete);
        f.box(x + 1, y + 1, 13, 1, steel);
        f.box(x, y + 2, 1, 12, steel);
        if ((x + y + variant) % 3 === 1) f.box(x + 11, y + 13, 3, 2, asphalt);
      }
    noise(f, gid, steel, 15);
    if (gid === tiles.sidewalkLeaves)
      for (let i = 0; i < 7; i++) {
        const n = artHash(i, gid, seed);
        const x = 4 + (n % 24);
        const y = 4 + ((n >>> 8) % 24);
        f.line(x - 1, y + 1, x + 1, y - 1, wood);
        f.box(x, y - 1, 2, 2, i % 2 ? gold : '#d98a5a');
      }
  });

  // Snow replaces background surfaces only. Road and cycle markings stay intact.
  tiles.snowGrass.forEach((gid, i) => {
    const f = tile(gid);
    f.box(0, 0, TILE, TILE, white);
    noise(f, gid, steel, 25, 2);
    noise(f, gid + 100, concrete, 10);
    if (i === 3) {
      // A few blades remain exposed away from the edges between tiles.
      const position = artHash(gid, i, seed);
      const x = 8 + (position & 15);
      const y = 8 + ((position >>> 4) & 15);
      f.box(x, y, 5, 2, steel);
      f.box(x + 1, y + 1, 3, 1, leaf);
      f.dot(x + 2, y, grass);
    }
  });
  tiles.snowSidewalk.forEach((gid, i) => {
    const underlying = tile(tiles.sidewalkVariants[i]!);
    const f = tile(gid);
    PNG.bitblt(sheet, sheet, underlying.x, underlying.y, TILE, TILE, f.x, f.y);
    for (let y = 0; y < TILE; y++) {
      const edge = artHash(gid, Math.floor(y / 4), seed);
      const inset = edge % 7;
      f.box(inset, y, TILE - inset - ((edge >>> 8) & 3), 1, steel);
      if (y % 16 !== 15)
        f.box(inset + 1, y, TILE - inset - ((edge >>> 8) & 3) - 4, 1, white);
    }
    noise(f, gid, steel, 14, 2);
  });

  tiles.bikeVariants.forEach((gid) => {
    const f = tile(gid);
    f.box(0, 0, 32, 32, red);
    noise(f, gid, '#ef7d57', 22);
    noise(f, gid + 100, earth, 19);
  });

  tiles.cobble.forEach((gid) => {
    const f = tile(gid);
    f.box(0, 0, 32, 32, asphalt);
    for (let y = 0; y < 32; y += 8)
      for (let x = y % 16 === 0 ? 0 : -4; x < 32; x += 8) {
        const color = [concrete, stone, concrete, steel][
          artHash(x + gid, y, seed) % 4
        ]!;
        f.box(x, y, 7, 7, color);
        f.dot(x, y, steel);
      }
  });

  tiles.gravel.forEach((gid, i) => {
    const f = tile(gid);
    f.box(0, 0, 32, 32, sand);
    noise(f, gid, '#8b6d5c', 17 + i * 3);
    noise(f, gid, cream, 39, 2);
  });

  tiles.sand.forEach((gid, i) => {
    const f = tile(gid);
    f.box(0, 0, 32, 32, cream);
    noise(f, gid, sand, 19 + i * 3);
    noise(f, gid, white, 34, 2);
  });

  tiles.water.forEach((gid, i) => {
    const f = tile(gid);
    f.box(0, 0, 32, 32, blue);
    for (let ribbon = 0; ribbon < 9; ribbon++) {
      const n = artHash(ribbon, 20, seed);
      const y = ((n >>> 8) + i) & 31;
      const x = (n + i * 3) & 31;
      for (let j = 0; j < 4 + (n & 7); j++)
        f.dot((x + j) & 31, y, ribbon % 3 === 0 ? cyan : sky);
    }
  });

  tile(tiles.roofLegacy).box(0, 0, 32, 32, asphalt);
  tile(tiles.dashVertical).box(0, 5, 2, 18, white);
  tile(tiles.dashHorizontal).box(5, 0, 18, 2, white);
  tile(tiles.solidVertical).box(0, 0, 2, 32, white);
  tile(tiles.solidHorizontal).box(0, 0, 32, 2, white);
  const zebra = tile(tiles.zebra);
  for (let y = 3; y < 32; y += 16) zebra.box(0, y, 32, 8, white);
  const crossing = tile(tiles.bikeCrossing);
  for (const x of [0, 27])
    for (const y of [2, 18]) crossing.box(x, y, 5, 5, white);
  tile(tiles.stop).box(0, 14, 32, 4, white);
  const yieldLine = tile(tiles.yield);
  for (const x of [3, 19])
    for (let y = 0; y < 7; y++)
      yieldLine.box(x + y, 12 + y, 13 - y * 2, 1, white);
  const cycle = tile(tiles.bicycle);
  for (const x of [7, 25]) {
    cycle.oval(x, 19, 6, 6, white);
    cycle.oval(x, 19, 4, 4, red, 0);
  }
  cycle.line(7, 19, 13, 12, white, 2);
  cycle.line(13, 12, 19, 19, white, 2);
  cycle.line(19, 19, 8, 19, white, 2);
  cycle.line(19, 19, 22, 11, white, 2);
  cycle.line(22, 11, 25, 19, white, 2);
  cycle.box(11, 10, 6, 2, white);
  cycle.box(20, 9, 6, 2, white);
  for (const [id, forward, left, right] of [
    [tiles.arrowStraight, true, false, false],
    [tiles.arrowLeft, false, true, false],
    [tiles.arrowRight, false, false, true],
    [tiles.arrowStraightLeft, true, true, false],
    [tiles.arrowStraightRight, true, false, true],
    [tiles.arrowLeftRight, false, true, true],
  ] as const) {
    const f = tile(id);
    f.box(14, forward ? 10 : 13, 4, forward ? 18 : 15, white);
    if (forward) {
      for (let i = 0; i < 7; i++) f.box(15 - i, 2 + i, i * 2 + 2, 1, white);
      f.box(14, 8, 4, 6, white);
    }
    if (left) {
      f.box(7, 13, 10, 4, white);
      for (let i = 0; i < 6; i++) f.box(2 + i, 14 - i, 1, i * 2 + 2, white);
    }
    if (right) {
      f.box(16, 13, 10, 4, white);
      for (let i = 0; i < 6; i++) f.box(29 - i, 14 - i, 1, i * 2 + 2, white);
    }
  }
  const rails = tile(tiles.rails);
  for (const y of [10, 21]) {
    rails.box(0, y - 1, 32, 4, ink);
    rails.box(0, y, 32, 2, concrete);
    rails.box(0, y, 32, 1, steel);
  }
  const ramp = tile(tiles.ramp);
  ramp.box(0, 0, 32, 3, concrete);
  ramp.box(0, 3, 32, 3, steel);
  for (let x = 2; x < 32; x += 4) ramp.box(x, 4, 2, 1, asphalt);

  for (let mask = 1; mask < 16; mask++) {
    const curb = tile(tiles.curbMask + mask);
    const verge = tile(tiles.vergeMask + mask);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const local = [y, 31 - x, 31 - y, x];
        const d = Math.min(
          ...local.map((v, side) => (mask & (1 << side) ? v : 32)),
        );
        let curbDepth = d;
        const radius = 14;
        // Join neighboring straight lips with a convex corner cut into the pavement.
        for (const [side, [dx, dy]] of corners.entries()) {
          if (!(mask & (1 << side)) || !(mask & (1 << ((side + 3) % 4))))
            continue;
          const a = dx < 0 ? x : 31 - x;
          const b = dy < 0 ? y : 31 - y;
          if (a < radius && b < radius) {
            curbDepth = Math.floor(radius - Math.hypot(radius - a, radius - b));
            break;
          }
        }
        if (curbDepth < 0) curb.dot(x, y, dark);
        else if (curbDepth < 4)
          curb.dot(x, y, [dark, steel, stone, asphalt][curbDepth]!);
        if (d < 3) verge.dot(x, y, [leaf, grass, asphalt][d]!);
      }
  }
}

export function cityArt(seed: number) {
  const terrain = new PNG({
    width: TILE * TILE_COLUMNS,
    height: (TILE_COUNT / TILE_COLUMNS) * TILE,
  });
  drawTerrain(terrain, seed);
  const walls = new PNG({ width: 32 * 4, height: 12 * wallKinds.length * 3 });
  const finishes = [
    [sand, cream, '#8b6d5c'],
    [brick, '#d98a5a', earth],
    ['#d98a5a', '#ef7d57', brick],
    [concrete, steel, asphalt],
  ] as const;
  finishes.forEach(([base, trim, shadow], kind) => {
    for (let row = 0; row < 3; row++)
      for (let variant = 0; variant < 4; variant++) {
        const f = new Frame(walls, variant * 32, (kind * 3 + row) * 12, 32, 12);
        f.box(0, 0, 32, 12, base);
        f.box(0, 0, 32, 1, trim);
        f.box(0, 11, 32, 1, shadow);
        if (kind === 1) {
          f.box(0, 5, 32, 1, shadow);
          f.box(4, 6, 1, 5, shadow);
          f.box(20, 1, 1, 4, shadow);
        }
        if (row === 2 && variant % 2 === 0) {
          f.box(3, 2, 11, 10, shadow);
          f.box(4, 3, 8, 9, wood);
          f.box(5, 4, 6, 3, dark);
          f.dot(10, 8, gold);
          f.box(18, 2, 12, 8, shadow);
          f.box(19, 3, 10, 6, white);
          f.box(20, 4, 8, 4, teal);
          f.box(23, 3, 1, 6, white);
        } else {
          for (const x of [4, 19]) {
            const lit =
              artHash(x + kind, row + variant, seed) % 5 === 0 ||
              (variant === 3 && x === 4);
            f.box(x, 2, 9, 8, shadow);
            f.box(x + 1, 2, 8, 7, trim);
            f.box(x + 2, 3, 6, 6, lit ? gold : dark);
            f.box(x + 2, 3, 6, 1, lit ? cream : concrete);
            f.box(x, 9, 10, 1, trim);
          }
        }
      }
  });

  const roofs = new PNG({ width: 32 * 4, height: 32 * roofKinds.length });
  const materials = [
    [asphalt, dark, concrete],
    [red, earth, brick],
    [copper, teal, '#38b764'],
    [sand, '#8b6d5c', cream],
  ] as const;
  materials.forEach(([base, seam, highlight], kind) => {
    for (let variant = 0; variant < 4; variant++) {
      const f = new Frame(roofs, variant * 32, kind * 32, 32, 32);
      f.box(0, 0, 32, 32, base);
      if (kind === 1) {
        for (let y = 0; y < 32; y += 4) {
          f.box(0, y, 32, 1, seam);
          for (let x = y % 8; x < 32; x += 8) f.box(x, y + 1, 1, 3, highlight);
        }
      } else {
        f.box(0, 0, 1, 32, seam);
        if (kind === 0) f.box(0, 16, 32, 1, seam);
        if (kind === 2) f.box(16, 0, 1, 32, seam);
        if (kind === 3) f.box(0, 0, 32, 1, highlight);
      }
      for (let i = 0; i < 19; i++) {
        const n = artHash(kind + variant * 10, i, seed);
        f.dot(n & 31, (n >>> 5) & 31, i % 3 ? highlight : seam, 255);
      }
    }
  });

  const details = new PNG({ width: 32 * roofDetails.length, height: 32 });
  for (const [i, detail] of roofDetails.entries()) {
    const f = new Frame(details, i * 32, 0, 32, 32);
    if (detail === 'chimney') {
      f.box(11, 12, 15, 12, ink, 95);
      f.box(7, 7, 13, 14, brick);
      f.box(6, 6, 15, 7, sand);
      f.box(8, 8, 11, 3, earth);
      f.box(9, 15, 11, 1, earth);
    } else if (detail === 'vent') {
      f.oval(19, 19, 10, 7, ink, 95);
      f.oval(14, 14, 8, 8, asphalt);
      f.oval(13, 12, 7, 6, steel);
      f.box(9, 12, 9, 2, dark);
      f.box(10, 9, 6, 1, white);
    } else if (detail === 'ac') {
      f.box(6, 12, 24, 14, ink, 95);
      f.box(2, 8, 24, 14, asphalt);
      f.box(2, 7, 24, 12, steel);
      f.oval(9, 13, 5, 5, dark);
      f.line(6, 13, 12, 13, concrete);
      f.line(9, 10, 9, 16, concrete);
      for (let x = 17; x < 24; x += 2) f.box(x, 10, 1, 6, asphalt);
    } else {
      f.box(6, 10, 24, 15, ink, 95);
      f.box(2, 6, 24, 15, concrete);
      f.box(4, 8, 20, 11, teal);
      f.line(5, 16, 19, 8, cyan, 2);
      f.box(13, 7, 2, 13, steel);
    }
  }
  const props = new PNG({ width: 48 * (BALL_FRAME + 1), height: 48 });
  for (const [i, kind] of propKinds.entries()) {
    const f = new Frame(props, i * 48, 0, 48, 48);
    if (kind === 'tree') {
      f.oval(24, 25, 20, 19, teal);
      f.oval(21, 21, 17, 16, leaf);
      for (const [x, y, rx, ry] of [
        [16, 17, 10, 9],
        [24, 15, 11, 10],
        [29, 23, 10, 8],
        [19, 27, 10, 8],
      ] as const) {
        f.oval(x, y, rx, ry, grass);
        f.oval(x - 3, y - 3, 3, 2, lime);
      }
      for (let dot = 0; dot < 35; dot++) {
        const n = artHash(i, dot, seed);
        const x = 10 + (n & 23);
        const y = 9 + ((n >>> 5) & 23);
        if (Math.hypot(x - 23, y - 23) < 13) f.dot(x, y, dot % 5 ? leaf : lime);
      }
    } else if (kind === 'lamp') {
      f.box(15, 20, 18, 7, dark);
      f.box(16, 20, 16, 4, steel);
      f.box(27, 23, 5, 3, gold);
    } else if (kind === 'bench') {
      f.box(9, 19, 30, 12, earth);
      f.box(10, 19, 28, 3, sand);
      f.box(10, 23, 28, 3, wood);
      f.box(10, 27, 28, 3, wood);
      for (const x of [12, 34]) f.box(x, 19, 2, 12, dark);
    } else if (kind === 'bin') {
      f.box(18, 18, 12, 13, teal);
      f.box(17, 17, 14, 5, leaf);
      f.box(19, 18, 8, 2, ink);
      f.box(19, 24, 2, 5, copper);
    } else if (kind === 'bollard') {
      f.oval(24, 24, 4, 4, dark);
      f.oval(23, 23, 3, 3, red);
      f.box(22, 22, 3, 1, white);
    } else if (kind === 'bike-rack') {
      f.box(6, 13, 36, 2, dark);
      f.box(6, 13, 2, 23, steel);
      f.box(40, 13, 2, 23, steel);
      for (const [x, color] of [
        [15, sky],
        [31, red],
      ] as const) {
        for (const y of [13, 33]) {
          f.box(x - 2, y - 4, 4, 8, ink);
          f.box(x - 1, y - 3, 2, 6, concrete);
        }
        f.line(x, 15, x + 3, 26, color, 2);
        f.line(x + 3, 26, x, 30, color);
        f.line(x, 16, x, 30, color);
        f.box(x - 4, 16, 9, 2, dark);
        f.box(x - 2, 24, 4, 3, ink);
      }
    } else if (kind === 'cafe') {
      for (const [x, y, color] of [
        [14, 15, teal],
        [32, 30, red],
      ] as const) {
        for (const dx of [-11, 8]) {
          f.box(x + dx, y - 3, 5, 7, earth);
          f.box(x + dx, y - 4, 5, 2, sand);
        }
        f.oval(x, y + 2, 10, 10, ink);
        f.oval(x, y, 10, 10, color);
        f.line(x - 6, y - 6, x + 6, y + 6, cream);
        f.line(x + 6, y - 6, x - 6, y + 6, cream);
        f.box(x - 1, y - 1, 3, 3, cream);
      }
    } else if (kind === 'kiosk') {
      f.box(6, 9, 36, 30, ink);
      f.box(7, 8, 33, 23, teal);
      f.box(7, 8, 33, 2, copper);
      f.box(9, 25, 29, 5, dark);
      f.box(12, 25, 24, 4, cyan);
      f.box(8, 31, 34, 8, cream);
      for (let x = 8; x < 42; x += 8) f.box(x, 31, 4, 8, red);
      f.box(8, 38, 34, 1, earth);
    } else {
      f.box(2, 13, 44, 21, dark);
      f.box(3, 13, 41, 17, concrete);
      f.box(4, 14, 39, 14, teal);
      for (const x of [4, 16, 29]) {
        f.line(x + 2, 26, x + 10, 17, cyan);
        f.box(x, 14, 1, 14, steel);
      }
      f.box(2, 30, 44, 2, steel);
      f.box(13, 32, 22, 2, wood);
    }
  }
  const ball = new Frame(props, BALL_FRAME * 48, 0, 48, 48);
  ball.oval(24, 24, 7, 7, ink);
  ball.oval(24, 23, 5, 5, '#e43b44');
  ball.oval(22, 21, 2, 2, white);
  ball.box(24, 23, 2, 2, white);
  return {
    'tiles.png': terrain,
    'walls.png': walls,
    'roofs.png': roofs,
    'roof-details.png': details,
    'props.png': props,
  };
}
