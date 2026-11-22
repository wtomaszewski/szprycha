import { expect, it, vi } from 'vitest';
import words from '../../content/nicki.json';
import {
  generateNickname,
  isGeneratedNickname,
  maxNicknameLength,
  migrateNickname,
  nicknameAt,
  nicknameCount,
} from '../../src/content/nicknames';

it('combines distinct friendly words into unique nicknames within the length limit', () => {
  for (const { adjectives, nouns } of words.groups) {
    for (const list of [adjectives, nouns]) {
      expect(new Set(list).size).toBe(list.length);
      for (const word of list) expect(word).toMatch(/^\p{L}+$/u);
    }
  }
  const catalog = Array.from({ length: nicknameCount }, (_, i) =>
    nicknameAt(i),
  );
  expect(new Set(catalog).size).toBe(nicknameCount);
  for (const nick of catalog) {
    expect(nick.length).toBeLessThanOrEqual(maxNicknameLength);
    expect(isGeneratedNickname(nick)).toBe(true);
  }
  expect(isGeneratedNickname('Szybki Jeż 042')).toBe(false);
  expect(isGeneratedNickname('Własny Tekst 7')).toBe(false);
});

it('preserves every old nickname and draws a different one on a reroll', () => {
  expect(migrateNickname(123)).toBe('Szybki Jeż 42');
  expect(migrateNickname(19)).toBe('Dzielna Szprycha 7');
  for (let seed = 0; seed < 300; seed++)
    expect(isGeneratedNickname(migrateNickname(seed))).toBe(true);

  const random = vi.spyOn(Math, 'random').mockReturnValue(0);
  try {
    const original = generateNickname();
    expect(original).toBe(nicknameAt(0));
    expect(generateNickname(original)).toBe(nicknameAt(nicknameCount - 1));
    expect(generateNickname(nicknameAt(nicknameCount - 1))).toBe(original);
  } finally {
    random.mockRestore();
  }
});
