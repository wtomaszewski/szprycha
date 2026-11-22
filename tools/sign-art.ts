import { Tile } from './sprite-art.ts';

const paper = 0xf4f4f4;
const red = 0xe43b44;
const amber = 0xfeae34;
const blue = 0x3b5dc9;
const ink = 0x1a1c2c;
const road = 0x566c86;

function disc(tile: Tile, x: number, y: number, radius: number, color: number) {
  for (let row = -radius; row <= radius; row++) {
    const half = Math.floor(Math.sqrt(radius ** 2 - row ** 2));
    tile.rect(x - half, y + row, 2 * half + 1, 1, color);
  }
}

function triangle(
  tile: Tile,
  tip: number,
  base: number,
  half: number,
  color: number,
) {
  const step = Math.sign(base - tip);
  for (let y = tip; y !== base + step; y += step) {
    const width = Math.round((half * (y - tip)) / (base - tip));
    tile.rect(32 - width, y, width * 2 + 1, 1, color);
  }
}

function diamond(tile: Tile, radius: number, color: number) {
  for (let y = -radius; y <= radius; y++) {
    const half = radius - Math.abs(y);
    tile.rect(32 - half, 32 + y, 2 * half + 1, 1, color);
  }
}

function bicycle(
  tile: Tile,
  y: number,
  color: number,
  background: number,
  size = 1,
) {
  const at = (x: number) => 32 + Math.round(x * size);
  const row = (dy: number) => y + Math.round(dy * size);
  for (const x of [-12, 12]) {
    disc(tile, at(x), row(4), Math.round(7 * size), color);
    disc(tile, at(x), row(4), Math.round(5 * size), background);
  }
  const line = (x: number, dy: number, toX: number, toY: number) =>
    tile.line(at(x), row(dy), at(toX), row(toY), color, size >= 1 ? 2 : 1);
  line(-12, 4, -5, -6);
  line(-5, -6, 2, 4);
  line(2, 4, -12, 4);
  line(2, 4, 8, -5);
  line(8, -9, 12, 4);
  line(8, -9, 12, -9);
  line(-8, -7, -3, -7);
}

const glyphs: Record<string, string> = {
  S: '111100111001111',
  T: '111010010010010',
  O: '111101101101111',
  P: '110101110100100',
  N: '101111111111101',
  I: '111010010010111',
  E: '111100110100111',
  D: '110101101101110',
  Y: '101101010010010',
  C: '111100100100111',
  Z: '111001010100111',
  ' ': '000000000000000',
};

function lettering(
  tile: Tile,
  label: string,
  top: number,
  size: number,
  color: number,
) {
  const left = Math.floor((64 - (4 * label.length - 1) * size) / 2);
  for (const [index, char] of [...label].entries()) {
    for (const [pixel, value] of [...glyphs[char]!].entries())
      if (value === '1')
        tile.rect(
          left + (4 * index + (pixel % 3)) * size,
          top + Math.floor(pixel / 3) * size,
          size,
          size,
          color,
        );
  }
}

function child(tile: Tile, x: number, y: number, facing: number) {
  disc(tile, x, y, 2, ink);
  tile.line(x, y + 3, x, y + 10, ink, 2);
  tile.line(x, y + 5, x + 4 * facing, y + 7, ink, 2);
  tile.line(x, y + 10, x - 3, y + 15, ink, 2);
  tile.line(x, y + 10, x + 3, y + 15, ink, 2);
}

export function signArt() {
  const designs: Record<string, (tile: Tile) => void> = {
    'A-7': (tile) => {
      triangle(tile, 57, 8, 29, red);
      triangle(tile, 48, 13, 21, amber);
    },
    'A-17': (tile) => {
      triangle(tile, 4, 54, 29, red);
      triangle(tile, 13, 49, 21, amber);
      child(tile, 27, 27, 1);
      child(tile, 37, 31, -1);
    },
    'B-2': (tile) => {
      disc(tile, 32, 32, 27, red);
      tile.rect(12, 27, 41, 11, paper);
    },
    'B-9': (tile) => {
      disc(tile, 32, 32, 27, red);
      disc(tile, 32, 32, 21, paper);
      bicycle(tile, 32, ink, paper);
    },
    'B-20': (tile) => {
      for (const [radius, color] of [
        [27, paper],
        [24, red],
      ] as const)
        for (let y = -radius; y <= radius; y++) {
          const half = Math.min(
            radius,
            Math.floor(radius * Math.SQRT2) - Math.abs(y),
          );
          tile.rect(32 - half, 32 + y, 2 * half + 1, 1, color);
        }
      lettering(tile, 'STOP', 27, 2, paper);
    },
    'C-13': (tile) => {
      disc(tile, 32, 32, 27, paper);
      disc(tile, 32, 32, 25, blue);
      bicycle(tile, 32, paper, blue);
    },
    'D-1': (tile) => {
      diamond(tile, 29, ink);
      diamond(tile, 28, paper);
      diamond(tile, 21, amber);
    },
    'P-23': (tile) => {
      tile.rect(4, 4, 56, 56, road);
      bicycle(tile, 32, paper, road, 1.2);
    },
    'T-22': (tile) => {
      tile.rect(4, 0, 56, 30, paper);
      tile.rect(5, 1, 54, 28, ink);
      tile.rect(6, 2, 52, 26, paper);
      lettering(tile, 'NIE DOTYCZY', 4, 1, ink);
      bicycle(tile, 19, ink, paper, 0.6);
    },
  };
  return Object.entries(designs).map(([code, draw]) => {
    const tile = new Tile(64, code === 'T-22' ? 30 : 64);
    draw(tile);
    return [code, tile.image] as const;
  });
}
