import type { ZodType } from 'zod';
import {
  rankingQuery,
  rankingSubmission,
  type RankingQuery,
  type RankingScore,
} from '../content/rankings';
import {
  newProfileId,
  type ProgressStore,
  type RankingProfile,
} from '../core/progressStore';
import {
  inputHash,
  qualifies,
  rankingSeed,
  type RankingResult,
} from './evidence';
import { cityBoard, leagues, playerBoard } from './responses';
import { rankingQueueLimit, rankingWeekStart } from './state';
import { rankingVersions, versionFor, type RankingVersions } from './versions';

const timeoutMs = 5_000;
const retryMs = 5_000;

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`Ranking API returned ${status}`);
  }
}

function retryable(error: unknown) {
  return (
    !(error instanceof HttpError) ||
    error.status >= 500 ||
    [408, 425, 429].includes(error.status)
  );
}

function scoreKey(score: RankingScore) {
  return `${score.kind}/${score.version}/${score.seed}/${score.inputHash}`;
}

export class RankingClient {
  private readonly base: URL;
  private serial = Promise.resolve();
  private pending = false;
  private removing = false;
  private nextAttempt = 0;
  private backoff = retryMs;

  constructor(
    private readonly store: ProgressStore,
    url: string,
    readonly versions: RankingVersions,
    private readonly fetcher = globalThis.fetch.bind(globalThis),
    private readonly online = () => globalThis.navigator?.onLine !== false,
  ) {
    this.base = new URL(url);
    this.base.pathname = this.base.pathname.replace(/\/?$/, '/');
    store.rankingXpVersion = versions.weeklyXp.version;
  }

  get enabled() {
    return this.consent !== undefined;
  }

  get consent() {
    const { onlineRankings, rankings } = this.store.profile;
    return onlineRankings &&
      !rankings?.deleting &&
      !this.removing &&
      !this.store.sessionOnly
      ? rankings?.consent
      : undefined;
  }

  get canDelete() {
    return Boolean(this.store.profile.rankings);
  }

  start() {
    window.addEventListener('online', () => {
      this.nextAttempt = 0;
      void this.flush();
    });
    window.setInterval(() => void this.flush(), retryMs);
    void this.flush();
  }

  get deletionPending() {
    return this.store.profile.rankings?.deleting === true;
  }

  setEnabled(enabled: boolean) {
    if (enabled && this.store.sessionOnly) return;
    const consent = enabled ? rankingSeed() : undefined;
    this.store.change((profile) => {
      if (profile.rankings?.deleting) return;
      profile.onlineRankings = enabled;
      if (consent !== undefined)
        profile.rankings = { ...profile.rankings, consent, queue: [] };
      else if (profile.rankings) {
        profile.rankings.queue = [];
        const { weekly } = profile.rankings;
        if (weekly) {
          weekly.xp = weekly.priorXp = weekly.sentXp;
          weekly.awards = [];
        }
      }
    });
    this.nextAttempt = 0;
    if (enabled) void this.flush();
  }

  async record(
    result: RankingResult,
    seed: number,
    consent: number,
    digest: () => Promise<string>,
  ) {
    if (this.consent !== consent || !qualifies(result)) return;
    const version = versionFor(this.versions, result);
    if (!version) return;
    try {
      const inputHash = await digest();
      const score = this.submission(this.store.profile, {
        ...result,
        seed,
        version,
        inputHash,
      })?.score;
      if (!score || this.consent !== consent) return;
      this.store.change((p) => {
        const state = p.rankings;
        if (!p.onlineRankings || state?.consent !== consent || state.deleting)
          return;
        if (state.queue.some((item) => scoreKey(item) === scoreKey(score)))
          return;
        state.queue.push(score);
        if (state.queue.length > rankingQueueLimit) state.queue.shift();
      });
      void this.flush();
    } catch {
      // A proof that cannot be computed stays local.
    }
  }

  async flush() {
    if (
      this.pending ||
      !this.enabled ||
      !this.online() ||
      Date.now() < this.nextAttempt
    )
      return;
    this.pending = true;
    try {
      await this.exclusive(async () => {
        const first = await this.store.rankingProfile();
        const consent = this.activeConsent(first);
        if (consent === undefined) return;
        const weekly = first.rankings?.weekly;
        const hasWeekly =
          weekly &&
          weekly.sentXp < weekly.xp &&
          weekly.week === rankingWeekStart(new Date());
        if (!first.rankings?.queue.length && !hasWeekly) return;
        const remote = await this.read('/v1/rules', rankingVersions);
        for (const score of first.rankings?.queue ?? []) {
          const profile = await this.store.rankingProfile();
          if (this.activeConsent(profile) !== consent) return;
          const key = scoreKey(score);
          if (!profile.rankings?.queue.some((item) => scoreKey(item) === key))
            continue;
          await this.post(profile, score, remote);
          this.store.change((p) => {
            if (p.rankings?.consent === consent)
              p.rankings.queue = p.rankings.queue.filter(
                (item) => scoreKey(item) !== key,
              );
          });
        }
        if (!hasWeekly) return;
        const hash = await inputHash(
          new TextEncoder().encode(
            JSON.stringify([weekly.week, weekly.priorXp, weekly.awards]),
          ),
        );
        const profile = await this.store.rankingProfile();
        if (this.activeConsent(profile) !== consent) return;
        if ((profile.rankings?.weekly?.sentXp ?? 0) >= weekly.xp) return;
        await this.post(
          profile,
          {
            kind: 'weekly-xp',
            week: weekly.week,
            xp: Math.min(weekly.xp, 1_000_000),
            seed: consent,
            version: weekly.version,
            inputHash: hash,
          },
          remote,
        );
        this.store.change((p) => {
          const entry = p.rankings?.weekly;
          if (
            p.rankings?.consent === consent &&
            entry?.week === weekly.week &&
            entry.version === weekly.version
          )
            entry.sentXp = Math.max(entry.sentXp, weekly.xp);
        });
      });
      this.backoff = retryMs;
    } catch {
      this.nextAttempt = Date.now() + this.backoff;
      this.backoff = Math.min(60_000, this.backoff * 2);
    } finally {
      this.pending = false;
    }
  }

  async board(query: RankingQuery, signal: AbortSignal) {
    const parsed = rankingQuery.parse(query);
    const search = new URLSearchParams(Object.entries(parsed));
    const path = '/v1/rankings?' + search;
    const id = await this.activeId();
    return parsed.board === 'cities'
      ? {
          kind: 'cities' as const,
          data: await this.read(path, cityBoard, id, signal),
        }
      : {
          kind: 'player' as const,
          data: await this.read(path, playerBoard, id, signal),
        };
  }

  async league(signal: AbortSignal) {
    return this.read('/v1/leagues', leagues, await this.activeId(), signal);
  }

  async deleteProfile() {
    if (!this.canDelete || this.removing) return false;
    this.removing = true;
    const { profileId } = this.store.profile;
    try {
      return await this.exclusive(async () => {
        const current = await this.store.rankingProfile();
        if (current.profileId !== profileId || !current.rankings) return false;
        this.store.change((p) => {
          if (p.profileId !== profileId || !p.rankings) return;
          p.onlineRankings = false;
          p.rankings.deleting = true;
          p.rankings.queue = [];
          delete p.rankings.weekly;
        });
        await this.store.flush();
        await this.request('/v1/profile', { method: 'DELETE' }, profileId);
        const nextId = newProfileId();
        this.store.change((p) => {
          if (p.profileId !== profileId) return;
          p.profileId = nextId;
          delete p.rankings;
        });
        await this.store.flush();
        return true;
      });
    } catch {
      return false;
    } finally {
      this.removing = false;
    }
  }

  private activeConsent(profile: RankingProfile) {
    const consent = this.consent;
    if (
      profile.onlineRankings &&
      !profile.rankings?.deleting &&
      profile.profileId === this.store.profile.profileId &&
      profile.rankings?.consent === consent
    )
      return consent;
  }

  private async activeId() {
    const profile = await this.store.rankingProfile();
    if (this.activeConsent(profile) === undefined)
      throw new Error('Rankings disabled');
    return profile.profileId;
  }

  private async post(
    profile: RankingProfile,
    score: RankingScore,
    remote: RankingVersions,
  ) {
    if (versionFor(remote, score) !== score.version) return;
    const submission = this.submission(profile, score);
    if (!submission) return;
    try {
      await this.request(
        '/v1/scores',
        { method: 'POST', body: JSON.stringify(submission) },
        profile.profileId,
      );
    } catch (error) {
      if (retryable(error)) throw error;
    }
  }

  private submission(profile: RankingProfile, score: RankingScore) {
    return rankingSubmission.safeParse({
      nickname: profile.nickname,
      avatarId: profile.avatarId,
      score,
    }).data;
  }

  private exclusive<T>(execute: () => Promise<T>) {
    const run = () =>
      globalThis.navigator?.locks
        ? navigator.locks.request('szprycha-ranking-sync', execute)
        : execute();
    const next = this.serial.then(run);
    this.serial = next.then(
      () => {},
      () => {},
    );
    return next;
  }

  private async read<T>(
    path: string,
    schema: ZodType<T>,
    id?: string,
    signal?: AbortSignal,
  ) {
    const response = await this.request(path, { signal }, id);
    return schema.parse(await response.json());
  }

  private async request(path: string, init: RequestInit, id?: string) {
    const headers = new Headers();
    if (id) headers.set('Authorization', 'Bearer ' + id);
    if (init.body) headers.set('Content-Type', 'application/json');
    const timeout = AbortSignal.timeout(timeoutMs);
    const url = new URL(path.slice(1), this.base);
    const response = await this.fetcher(url, {
      ...init,
      headers,
      signal: init.signal ? AbortSignal.any([timeout, init.signal]) : timeout,
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) throw new HttpError(response.status);
    return response;
  }
}
