import { IDBFactory } from 'fake-indexeddb';
import { ProgressStore } from '../../src/core/progressStore';
import { beforeAll, describe, expect, it } from 'vitest';
import { dialogueFileSchema } from '../../src/content/dialogues';
import { contentSchema, type GameContent } from '../../src/content/schemas';
import {
  canOpenPhone,
  missionLines,
  MissionProgress,
} from '../../src/gameplay/MissionProgress';
import { readContent } from '../../tools/content';

let content: GameContent;
beforeAll(async () => {
  content = await readContent();
});

describe('dialogue content', () => {
  it.each([
    { linie: [] },
    { linie: [{ postac: 'ola', emocja: 'sad', tekst: 'dialogi.test' }] },
    { linie: [{ postac: 'ola', emocja: 'proud', tekst: 'free text' }] },
    {
      linie: [
        {
          postac: 'ola',
          emocja: 'proud',
          tekst: 'dialogi.test',
          lektor: 'free text',
        },
      ],
    },
  ])('rejects invalid dialogue lines', (data) => {
    expect(
      dialogueFileSchema.safeParse({
        dialogi: [{ id: 'dialogi.test', ...data }],
      }).success,
    ).toBe(false);
  });

  it('rejects missing dialogue and speaker references, duplicate IDs and introductions for unknown rules', () => {
    const invalid = structuredClone(content);
    invalid.misje[0]!.dialog_koniec = 'dialogi.missing';
    const opening = invalid.dialogi.dialogi.find(
      ({ id }) => id === 'dialogi.WAW-T-01.start',
    )!;
    opening.linie[0]!.postac = 'missing';
    invalid.dialogi.dialogi.push(opening);
    invalid.dialogi.zapowiedzi.find(
      ({ regula }) => regula === 'KASK-01',
    )!.regula = 'missing';
    const result = contentSchema.safeParse(invalid);
    expect(result.error?.issues.map(({ message }) => message)).toEqual(
      expect.arrayContaining([
        'Unknown dialogue: dialogi.missing',
        'Unknown character: missing',
        'Duplicate ID: dialogi.WAW-T-01.start',
        'Unknown rule ID: missing',
        'Missing rule introduction: KASK-01',
      ]),
    );
  });

  it('preserves scripted order and introduces each rule once across missions and reloads', async () => {
    const factory = new IDBFactory();
    const tutorial = content.misje[0]!;
    const { dialogi } = content;
    const progress = new MissionProgress(await ProgressStore.open(factory));
    const lines = progress.opening(tutorial, dialogi);

    expect(lines.map(({ tekst }) => tekst)).toEqual([
      'dialogi.reguly.KASK-01',
      'dialogi.reguly.ZNAK-STOP',
      'dialogi.WAW-T-01.powitanie',
    ]);
    expect(lines.slice(0, 2).map(({ postac }) => postac)).toEqual([
      'sierzant_ola',
      'sierzant_ola',
    ]);
    expect(lines[1]?.lektor).toBe('dialogi.lektor.ZNAK-STOP');

    const next = { ...tutorial, id: 'WAW-A1-99' };
    await progress.store.flush();
    for (const session of [
      progress,
      new MissionProgress(await ProgressStore.open(factory)),
    ])
      expect(session.opening(next, dialogi).map(({ tekst }) => tekst)).toEqual([
        'dialogi.WAW-T-01.powitanie',
      ]);
    expect(
      missionLines(dialogi, tutorial.dialog_koniec).map(({ tekst }) => tekst),
    ).toEqual(['dialogi.WAW-T-01.meta', 'dialogi.WAW-T-01.po_mecie']);
  });
});

describe('SzprychaApp', () => {
  it('allows the phone only at zero simulation speed', () => {
    expect(canOpenPhone(0)).toBe(true);
    for (const speed of [0.001, 1, -1, NaN])
      expect(canOpenPhone(speed)).toBe(false);
  });

  it('requires prior successes and the declared minimum rank', () => {
    const world = structuredClone(content);
    const first = world.misje[0]!;
    const progress = new MissionProgress();
    const order = {
      ...first,
      id: 'WAW-A1-99',
      wymagania: { misje_ukonczone: [first.id], ranga_min: 'kurier' },
    };
    expect(progress.isAvailable(first, world)).toBe(true);
    expect(progress.isAvailable(order, world)).toBe(false);
    progress.complete(first, {
      points: 4000,
      stars: 1,
      balance: world.balans.gwiazdki,
    });
    expect(progress.isAvailable(order, world)).toBe(true);
    order.wymagania.ranga_min = 'kurier_pro';
    progress.complete(first);
    expect(progress.isAvailable(order, world)).toBe(false);
    order.wymagania.ranga_min = 'legenda';
    expect(progress.isAvailable(order, world)).toBe(false);
  });
});
