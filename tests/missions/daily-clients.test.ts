import { describe, expect, it } from 'vitest';
import {
  allowedClientNames,
  clientContentSchema,
} from '../../src/content/clients';
import { portraitEmotions } from '../../src/content/dialogues';
import { ClientGenerator } from '../../src/gameplay/procedural/clients';
import { clientPosition } from '../../src/gameplay/procedural/clientPosition';
import {
  clientPortraitDesign,
  dailyClientSpriteSize,
  drawDailyClientSprite,
} from '../../src/render/dailyClientArt';
import { PixelTile } from '../../src/render/PixelTile';
import { drawPortrait, portraitSize } from '../../src/render/portraitArt';
import type { Zone } from '../../src/rules/world/WorldModel';
import { readContent } from '../../tools/content';

const content = (await readContent()).zleceniodawcy;
const generator = new ClientGenerator(content);

describe('daily clients', () => {
  it('generates over 1000 different names and appearances from a range of seeds', () => {
    const clients = Array.from({ length: 5000 }, (_, seed) =>
      generator.generate(seed),
    );
    expect(
      new Set(clients.map(({ name }) => name)).size,
    ).toBeGreaterThanOrEqual(1000);
    expect(
      new Set(clients.map(({ appearance }) => JSON.stringify(appearance))).size,
    ).toBeGreaterThanOrEqual(1000);
    expect(new Set(clients.map(({ occupation }) => occupation))).toEqual(
      new Set(content.zawody),
    );
    expect(new Set(clients.map(({ trait }) => trait))).toEqual(
      new Set(content.cechy),
    );
    expect(Math.min(...clients.map(({ age }) => age))).toBe(19);
    expect(Math.max(...clients.map(({ age }) => age))).toBe(79);
    const newGenerator = new ClientGenerator(content);
    expect(clients).toEqual(
      clients.map((_, seed) => newGenerator.generate(seed)),
    );
  });

  it('filters excluded name pairs regardless of case, accents, or separators', () => {
    const unrestricted = { ...content, wykluczenia: [] };
    const blocked = ['Jacek Placek', 'Róża Róża'];
    const allNames = allowedClientNames(unrestricted).map(
      ({ firstName, nickname }) => `${firstName} ${nickname}`,
    );
    expect(allNames).toEqual(expect.arrayContaining(blocked));
    const allowed = allowedClientNames({
      ...content,
      wykluczenia: [' JACEK-placek ', 'Roza  Roza'],
    });
    expect(allowed).toEqual(allowedClientNames(content));
    expect(allowed).toHaveLength(allNames.length - blocked.length);
    expect(
      clientContentSchema.safeParse({ ...content, imiona: ['Róża'] }).success,
    ).toBe(false);
  });

  it('renders distinct 64×64 expressions without changing a client’s outfit', () => {
    const client = generator.generate(43);
    const design = clientPortraitDesign(client);
    function render(emotion: (typeof portraitEmotions)[number]) {
      const data = new Uint8ClampedArray(portraitSize * portraitSize * 4);
      drawPortrait(
        new PixelTile({ width: portraitSize, height: portraitSize, data }),
        emotion,
        design,
      );
      return Buffer.from(data.buffer);
    }
    const frames = portraitEmotions.map(render);
    expect(portraitSize).toBe(64);
    expect(new Set(frames.map((frame) => frame.toString('base64'))).size).toBe(
      5,
    );
    expect(frames[0]).toEqual(render('neutral'));
    for (const frame of frames)
      expect(frame.subarray(48 * portraitSize * 4)).toEqual(
        frames[0]!.subarray(48 * portraitSize * 4),
      );

    const size = dailyClientSpriteSize;
    const data = new Uint8ClampedArray(size * size * 4);
    drawDailyClientSprite(
      new PixelTile({ width: size, height: size, data }),
      client,
    );
    const colors = Array.from({ length: size * size }, (_, i) =>
      data.subarray(i * 4, i * 4 + 4),
    );
    expect(colors.some((pixel) => pixel[3] === 0)).toBe(true);
    expect(
      colors.some(
        (pixel) =>
          pixel[3] === 255 &&
          design.shirt === ((pixel[0]! << 16) | (pixel[1]! << 8) | pixel[2]!),
      ),
    ).toBe(true);
  });

  it('puts the client on a sidewalk beside a roadway POI and avoids a crossing', () => {
    const poi = { id: 'poi', x: 64, y: 64, width: 0, height: 0, heading: 0 };
    const roadway: Zone = {
      id: 'road',
      x: 0,
      y: 48,
      width: 128,
      height: 32,
      kind: 'roadway',
    };
    const sidewalk: Zone = {
      id: 'sidewalk',
      x: 0,
      y: 80,
      width: 128,
      height: 24,
      kind: 'sidewalk',
    };
    const world = {
      width: 128,
      height: 128,
      metersPerPixel: 1,
      zones: [roadway, sidewalk],
      walls: [],
      driveways: [],
      crossings: [],
    };
    expect(clientPosition(world, poi)).toEqual({ x: 64, y: 96 });
    const crossing = {
      ...sidewalk,
      x: 52,
      width: 24,
      kind: 'pedestrian' as const,
      axis: 'y' as const,
    };
    const shifted = clientPosition({ ...world, crossings: [crossing] }, poi);
    expect(shifted?.y).toBeGreaterThan(80);
    expect(Math.abs(shifted!.x - 64)).toBeGreaterThanOrEqual(21);
  });
});
