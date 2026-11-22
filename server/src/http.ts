import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import {
  rankingLeague,
  rankingQuery,
  rankingSubmission,
} from '../../src/content/rankings.ts';
import { rankingCalendar, type SeasonSettings } from './calendar.ts';
import { validateScore, type RankingRules } from './rules.ts';
import type { RankingStore } from './store.ts';
import {
  HttpError,
  json,
  profileIdOf,
  rateLimit,
  send,
} from './httpSupport.ts';
import { classRoutes } from './classHttp.ts';

const methods = new Map([
  ['/v1/health', 'GET'],
  ['/v1/rules', 'GET'],
  ['/v1/scores', 'POST'],
  ['/v1/rankings', 'GET'],
  ['/v1/leagues', 'GET'],
  ['/v1/profile', 'DELETE'],
]);
interface Options {
  store: RankingStore;
  rules: RankingRules;
  origins: readonly string[];
  season: SeasonSettings;
  requestsPerMinute: number;
  now?: () => Date;
}

export function createRankingServer({
  store,
  rules,
  origins,
  season,
  requestsPerMinute,
  now = () => new Date(),
}: Options) {
  const allowedOrigins = new Set(origins);
  const throttle = rateLimit(requestsPerMinute);
  const classes = classRoutes(store.classes, now);

  async function handle(req: IncomingMessage, res: ServerResponse) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin');
    const origin = req.headers.origin;
    if (origin !== undefined) {
      if (!allowedOrigins.has(origin))
        throw new HttpError(403, 'origin_denied');
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    const url = new URL('http://rankings.local' + req.url);
    const rankingsMethod = methods.get(url.pathname);
    const route = classes(url.pathname);
    const allowed = rankingsMethod ? [rankingsMethod] : route?.methods;
    if (!allowed) throw new HttpError(404, 'not_found');
    if (req.method === 'OPTIONS') {
      const requested = req.headers['access-control-request-method'];
      if (!origin || !allowed.some((value) => value === requested))
        throw new HttpError(403, 'preflight_denied');
      res.setHeader('Access-Control-Allow-Methods', allowed.join(', '));
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type',
      );
      res.setHeader('Vary', 'Origin, Access-Control-Request-Method');
      return send(res, 204);
    }
    const method = req.method;
    if (!method || !allowed.includes(method)) {
      res.setHeader('Allow', allowed.join(', ') + ', OPTIONS');
      throw new HttpError(405, 'method_not_allowed');
    }

    if (url.pathname === '/v1/health') return send(res, 200, { status: 'ok' });
    const retry = throttle(req.socket.remoteAddress ?? '', Date.now());
    if (retry) {
      res.setHeader('Retry-After', retry);
      throw new HttpError(429, 'rate_limited');
    }

    if (route) return route.handle(req, res);

    const profileId = profileIdOf(req);
    if ((method === 'POST' || method === 'DELETE') && profileId === null)
      throw new HttpError(401, 'profile_required');

    if (url.pathname === '/v1/rules') return send(res, 200, rules);

    if (url.pathname === '/v1/scores') {
      const parsed = rankingSubmission.safeParse(await json(req));
      if (!parsed.success) throw new HttpError(400, 'invalid_score');
      const calendar = rankingCalendar(now(), season);
      const { score } = parsed.data;
      if (!validateScore(score, rules))
        throw new HttpError(422, 'implausible_score');
      if (score.kind === 'weekly-xp' && score.week !== calendar.week)
        throw new HttpError(409, 'week_closed');
      const accepted = store.submit(profileId!, parsed.data, calendar);
      return send(res, accepted ? 201 : 200, {
        accepted,
        week: calendar.week,
        season: calendar.season,
      });
    }

    const calendar = rankingCalendar(now(), season);
    if (url.pathname === '/v1/profile') {
      store.deleteProfile(profileId!, calendar.week);
      return send(res, 204);
    }
    if (url.pathname === '/v1/leagues') {
      return send(res, 200, {
        week: calendar.week,
        leagues: rankingLeague.options,
        league: store.league(profileId, calendar.week),
      });
    }

    const query = rankingQuery.safeParse(Object.fromEntries(url.searchParams));
    if (
      !query.success ||
      Object.keys(query.data).length !== url.searchParams.size
    )
      throw new HttpError(400, 'invalid_board');
    if (
      query.data.board === 'mission' &&
      rules.missions[query.data.missionId]?.city !== query.data.city
    )
      throw new HttpError(404, 'unknown_mission');
    return send(res, 200, {
      ...query.data,
      week: calendar.week,
      season: calendar.season,
      ...store.leaderboard(query.data, profileId, calendar, rules),
    });
  }

  const server = createServer(
    { requestTimeout: 10_000, headersTimeout: 5_000 },
    (req, res) => {
      void handle(req, res).catch((error: unknown) => {
        if (res.destroyed || res.writableEnded) return;
        // Only constant messages reach logs. Never include headers, URLs or request data.
        if (error instanceof HttpError) {
          if (!req.complete) res.setHeader('Connection', 'close');
          send(res, error.status, { error: error.code });
        } else {
          console.error('Ranking request failed');
          send(res, 500, { error: 'internal_error' });
        }
      });
    },
  );
  server.on('clientError', (_error, socket) => socket.destroy());
  return server;
}
