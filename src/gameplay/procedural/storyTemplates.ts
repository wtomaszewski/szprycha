import type { MissionCity } from '../../content/missions';
import type { OrderKind } from './orders';
import { orderSeed } from './seed';

export const storyTemplates = [
  { id: 'lostParcel', kinds: ['pickup', 'collect', 'delivery'], tokens: 8 },
  {
    id: 'neighbours',
    kinds: ['pickup', 'escort', 'collect', 'fragile'],
    tokens: 10,
  },
  {
    id: 'festival',
    kinds: ['pickup', 'delivery', 'collect', 'escort', 'fragile'],
    tokens: 12,
  },
  {
    id: 'mysterySign',
    kinds: ['pickup', 'photo', 'collect', 'delivery'],
    tokens: 10,
  },
] as const satisfies readonly {
  id: string;
  kinds: readonly OrderKind[];
  tokens: number;
}[];

type StoryTemplate = (typeof storyTemplates)[number]['id'];

export type StoryOrder = {
  seed: number;
  index: number;
  step: number;
  total: number;
  template: StoryTemplate;
};

export function storySeed(city: MissionCity, nicknameSeed: number) {
  return orderSeed(`${city}/story/${nicknameSeed}`);
}

export function storySticker(city: MissionCity, template: StoryTemplate) {
  return `story-${template}-${city}`;
}

export function storyStepKey({ template, step }: StoryOrder) {
  return `procedural.stories.templates.${template}.steps.${step}`;
}
