import { allowedClientNames, type ClientContent } from '../../content/clients';
import type { MissionCity } from '../../content/missions';
import { orderSeed } from './seed';

export const clientHaircuts = ['short', 'bun', 'swept', 'curly'] as const;
export const clientHats = ['none', 'none', 'none', 'cap', 'beanie'] as const;
export const clientGarments = ['shirt', 'jacket', 'pullover'] as const;

export type ClientAppearance = {
  face: number;
  haircut: (typeof clientHaircuts)[number];
  hat: (typeof clientHats)[number];
  glasses: boolean;
  garment: (typeof clientGarments)[number];
  skin: number;
  hair: number;
  clothes: number;
};

export type DailyClient = {
  id: string;
  firstName: string;
  nickname: string;
  name: string;
  age: number;
  occupation: string;
  trait: string;
  appearance: ClientAppearance;
};

export class ClientGenerator {
  private readonly names: ReturnType<typeof allowedClientNames>;

  constructor(private readonly content: ClientContent) {
    this.names = allowedClientNames(content);
  }

  atPoi(city: MissionCity, poiId: string): DailyClient {
    return this.generate(`${city}-${poiId}`);
  }

  generate(key: string | number): DailyClient {
    const draw = (part: string, count: number) =>
      orderSeed(`daily-client/${key}/${part}`) % count;
    const { firstName, nickname } =
      this.names[draw('name', this.names.length)]!;
    return {
      id: `daily-client-${key}`,
      firstName,
      nickname,
      name: `${firstName} ${nickname}`,
      age: 19 + draw('age', 61),
      occupation:
        this.content.zawody[draw('occupation', this.content.zawody.length)]!,
      trait: this.content.cechy[draw('trait', this.content.cechy.length)]!,
      appearance: {
        face: draw('face', 5) - 2,
        haircut: clientHaircuts[draw('haircut', clientHaircuts.length)]!,
        hat: clientHats[draw('hat', clientHats.length)]!,
        glasses: draw('glasses', 3) === 0,
        garment: clientGarments[draw('garment', clientGarments.length)]!,
        skin: draw('skin', 5),
        hair: draw('hair', 6),
        clothes: draw('clothes', 8),
      },
    };
  }
}
