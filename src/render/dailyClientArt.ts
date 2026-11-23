import type { DailyClient } from '../gameplay/procedural/clients';
import type { PixelTile } from './PixelTile';
import type { PortraitDesign } from './portraitArt';

const skinPalettes = [
  [0xf3d6b0, 0xc58e72, 0xffe8c2, 0x935e55],
  [0xe8b28c, 0xb9765f, 0xffd2a0, 0x8e5048],
  [0xc78a60, 0x9a5c47, 0xe7b489, 0x693e3c],
  [0xa26248, 0x784437, 0xcd8d64, 0x503034],
  [0x754c3d, 0x523133, 0xa76b53, 0x3d2830],
] as const;
const hairPalettes = [
  [0x262535, 0x5c556b],
  [0x513632, 0x936046],
  [0xa35038, 0xd88753],
  [0xc28a4e, 0xf0be78],
  [0x737384, 0xb5b5c5],
  [0xd4cbc1, 0xf5e6d8],
] as const;
const clothesPalettes = [
  [0x5494a0, 0x305966, 0x99c5c9],
  [0xb45261, 0x743a50, 0xe9908c],
  [0x5f8955, 0x3d5c48, 0xa4bd79],
  [0x7772a2, 0x4f496b, 0xb1a9cf],
  [0xc28552, 0x7f543e, 0xefba70],
  [0x477bad, 0x344d70, 0x8fb6d7],
  [0x70948b, 0x3e6261, 0xa8c9ac],
  [0xb87778, 0x7a4a58, 0xe0ad9e],
] as const;
const ink = 0x1a1c2c;

export function clientPortraitDesign(client: DailyClient): PortraitDesign {
  const { appearance, age } = client;
  const [shirt, backdrop, hatLight] = clothesPalettes[appearance.clothes]!;
  const [hair, hairLight] = hairPalettes[appearance.hair]!;
  const [skin, shade, light, deepShade] = skinPalettes[appearance.skin]!;
  return {
    style: appearance.haircut === 'bun' ? 'bun' : 'hair',
    hairstyle:
      appearance.haircut === 'swept' || appearance.haircut === 'curly'
        ? appearance.haircut
        : undefined,
    headwear: appearance.hat === 'none' ? undefined : appearance.hat,
    glasses: appearance.glasses,
    face: appearance.face,
    age: age >= 62 ? 'older' : undefined,
    garment: appearance.garment === 'shirt' ? undefined : appearance.garment,
    hat: shirt,
    hatLight,
    backdrop,
    shirt,
    skin,
    skinTones: [shade, light, deepShade],
    hair,
    hairLight,
  };
}

export const dailyClientSpriteSize = 24;

export function drawDailyClientSprite(tile: PixelTile, client: DailyClient) {
  const { appearance } = client;
  const [shirt, shade, light] = clothesPalettes[appearance.clothes]!;
  const [skin, skinShade, skinLight] = skinPalettes[appearance.skin]!;
  const [hair, hairLight] = hairPalettes[appearance.hair]!;
  tile.oval(5, 17, 14, 5, ink, 110);
  for (const x of [9, 14]) {
    tile.stroke(x, 14, x, 19, 2, ink);
    tile.line(x, 15, x, 18, 0x505872);
    tile.bevel(x - 1, 19, 4, 3, ink);
  }
  const wide = Number(appearance.garment === 'jacket');
  tile.oval(6 - wide, 8, 12 + wide * 2, 9, ink);
  tile.oval(7 - wide, 9, 10 + wide * 2, 7, shade);
  tile.oval(8 - wide, 9, 8 + wide * 2, 6, shirt);
  tile.line(8, 11, 10, 10, light);
  tile.rect(6 - wide, 13, 2, 2, skinShade);
  tile.rect(16 + wide, 13, 2, 2, skin);
  tile.oval(8, 2, 9, 9, ink);
  tile.oval(9, 3, 7, 7, skinShade);
  tile.oval(9, 4, 6, 5, skin);
  tile.rect(10, 7, 2, 1, skinLight);
  tile.oval(8, 2, 9, 5, appearance.hat === 'none' ? hair : shirt);
  tile.line(10, 3, 13, 3, appearance.hat === 'none' ? hairLight : light);
  if (appearance.hat === 'cap') tile.rect(10, 6, 8, 1, shade);
  if (appearance.hat === 'none' && appearance.haircut === 'bun')
    tile.oval(10, 1, 4, 3, hair);
  if (appearance.glasses) tile.line(10, 7, 15, 7, ink);
}
