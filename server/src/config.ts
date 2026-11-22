import { z } from 'zod';
import { seasonSettings } from './calendar.ts';

function isOrigin(origin: string) {
  if (origin === 'capacitor://localhost') return true;
  try {
    const url = new URL(origin);
    return ['http:', 'https:'].includes(url.protocol) && url.origin === origin;
  } catch {
    return false;
  }
}

const settings = z.strictObject({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  database: z.string().min(1),
  origins: z.array(z.string().refine(isOrigin)),
  requestsPerMinute: z.coerce.number().int().min(1).max(100_000),
  season: seasonSettings,
});

export function serverConfig(env: NodeJS.ProcessEnv) {
  return settings.parse({
    host: env.RANKING_HOST ?? '127.0.0.1',
    port: env.RANKING_PORT ?? '8787',
    database: env.RANKING_DB ?? 'data/rankings.sqlite',
    origins: (env.RANKING_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    requestsPerMinute: env.RANKING_REQUESTS_PER_MINUTE ?? '240',
    season: {
      anchor: env.RANKING_SEASON_START ?? '2026-01-05',
      weeks: Number(env.RANKING_SEASON_WEEKS ?? '13'),
    },
  });
}
