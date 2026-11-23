import { z } from 'zod';

import { stations } from './radio/catalog';
export { stations, type Station } from './radio/catalog';
export const channels = ['music', 'effects', 'voice'] as const;
const volume = z.number().min(0).max(1);

export const audioSettingsSchema = z.strictObject({
  music: volume,
  effects: volume,
  voice: volume,
  muted: z.boolean(),
  readAloud: z.boolean(),
  station: z.enum(stations),
  bell: z.union([z.literal(0), z.literal(1), z.literal(2)]),
});

export type AudioSettings = z.infer<typeof audioSettingsSchema>;
export type Channel = (typeof channels)[number];

export const defaultAudio: Readonly<AudioSettings> = {
  music: 0.6,
  effects: 0.75,
  voice: 1,
  muted: false,
  readAloud: true,
  station: 'hits',
  bell: 0,
};

export function channelLevel(
  settings: Readonly<AudioSettings>,
  channel: Channel,
  ducked = false,
) {
  if (settings.muted || (channel === 'voice' && !settings.readAloud)) return 0;
  return settings[channel] * (channel === 'music' && ducked ? 0.26 : 1);
}
