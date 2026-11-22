import words from '../../content/nicki.json' with { type: 'json' };

export const maxNicknameLength = 24;
const suffixCount = 100;
const stems = words.groups.flatMap(({ adjectives, nouns }) =>
  adjectives.flatMap((adjective) =>
    nouns.map((noun) => `${adjective} ${noun}`),
  ),
);
const nicknameStems = new Set(stems);
export const nicknameCount = stems.length * suffixCount;

export function nicknameAt(index: number) {
  return `${stems[Math.floor(index / suffixCount)]} ${(index % suffixCount) + 1}`;
}

export function isGeneratedNickname(nickname: string) {
  const split = nickname.lastIndexOf(' ');
  const suffix = nickname.slice(split + 1);
  return (
    nicknameStems.has(nickname.slice(0, split)) &&
    /^(?:[1-9]\d?|100)$/.test(suffix)
  );
}

export function generateNickname(current?: string) {
  const count = current === undefined ? nicknameCount : nicknameCount - 1;
  const index = Math.floor(Math.random() * count);
  // If the draw reaches the current nick, substitute the unused last slot.
  const drawn = nicknameAt(index);
  return drawn === current ? nicknameAt(nicknameCount - 1) : drawn;
}

export function migrateNickname(seed: number) {
  return `${words.legacy[seed % words.legacy.length]} ${Math.floor(seed / words.legacy.length) + 1}`;
}
