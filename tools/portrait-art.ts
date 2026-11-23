import { PNG } from 'pngjs';
import { portraitEmotions } from '../src/content/dialogues.ts';
import {
  drawPortrait,
  portraitSize,
  type PortraitDesign,
} from '../src/render/portraitArt.ts';
import { Tile } from './sprite-art.ts';

const cream = 0xf0dca8;
const ink = 0x1a1c2c;
const paper = 0xf4f4f4;
const gold = 0xffcd75;
const gray = 0x94b0c2;
const tan = 0xe8c39e;
const coral = 0xef7d57;
const red = 0xb13e53;
const blue = 0x41a6f6;
const teal = 0x257179;
const green = 0x3e8948;
const plum = 0x5d275d;
const navy = 0x29366f;
const brown = 0xd98a5a;

const portraits: Record<string, PortraitDesign> = {
  gracz: {
    age: 'young',
    face: 1,
    hat: gold,
    hatLight: cream,
    backdrop: teal,
    shirt: coral,
    hair: gold,
    skin: tan,
    style: 'helmet',
  },
  pan_kazik: {
    age: 'older',
    face: -1,
    hat: teal,
    backdrop: teal,
    shirt: green,
    hair: gray,
    skin: tan,
    style: 'cap',
    beard: true,
  },
  sierzant_ola: {
    face: 1,
    hat: blue,
    hatLight: 0x73eff7,
    backdrop: navy,
    shirt: blue,
    hair: brown,
    skin: tan,
    style: 'helmet',
  },
  turbo: {
    age: 'young',
    face: 1,
    backdrop: plum,
    shirt: red,
    hair: coral,
    skin: tan,
    style: 'hair',
  },
  dj_dzwonek: {
    face: -2,
    backdrop: navy,
    shirt: gold,
    hair: ink,
    skin: brown,
    style: 'headphones',
  },
  lena_mapa: {
    face: 1,
    backdrop: teal,
    shirt: red,
    hair: ink,
    skin: brown,
    style: 'bun',
    glasses: true,
  },
  maly_franek: {
    age: 'young',
    face: -1,
    hat: green,
    backdrop: navy,
    shirt: green,
    hair: coral,
    skin: tan,
    style: 'cap',
  },
  pani_halina: {
    age: 'older',
    face: 1,
    backdrop: plum,
    shirt: red,
    hair: gray,
    skin: tan,
    style: 'bun',
    glasses: true,
  },
  profesor_kwant: {
    age: 'older',
    face: 2,
    backdrop: teal,
    shirt: paper,
    hair: gray,
    skin: tan,
    style: 'hair',
    glasses: true,
  },
  inzynier_zawila: {
    age: 'older',
    face: 1,
    backdrop: navy,
    shirt: brown,
    hair: gray,
    skin: tan,
    style: 'hair',
    beard: true,
  },
  krasnal_dzwoneczek: {
    face: -2,
    backdrop: plum,
    shirt: green,
    hair: gray,
    skin: tan,
    style: 'bell',
    beard: true,
  },
  pan_latarnik: {
    hat: navy,
    backdrop: navy,
    shirt: teal,
    hair: ink,
    skin: tan,
    style: 'cap',
    beard: true,
  },
  pani_doktor: {
    face: 1,
    backdrop: teal,
    shirt: paper,
    hair: brown,
    skin: brown,
    style: 'bun',
  },
  gang_bez_hamulcow: {
    age: 'young',
    face: -1,
    hat: red,
    hatLight: coral,
    backdrop: plum,
    shirt: red,
    hair: red,
    skin: brown,
    style: 'helmet',
  },
};

export function portraitArt() {
  return Object.entries(portraits).map(([id, design]) => {
    const sheet = new PNG({
      width: portraitSize * portraitEmotions.length,
      height: portraitSize,
    });
    portraitEmotions.forEach((emotion, frame) => {
      const tile = new Tile(portraitSize, portraitSize);
      drawPortrait(tile, emotion, design);
      PNG.bitblt(
        tile.image,
        sheet,
        0,
        0,
        portraitSize,
        portraitSize,
        frame * portraitSize,
        0,
      );
    });
    return [id, sheet] as const;
  });
}
