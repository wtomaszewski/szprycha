import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import {
  rankingLeague,
  type RankingLeague,
  type RankingQuery,
  type RankingSubmission,
} from '../../src/content/rankings.ts';
import { missionCity, type MissionCity } from '../../src/content/missions.ts';
import { ClassStore } from './classes.ts';
import type { RankingCalendar } from './calendar.ts';
import type { RankingRules } from './rules.ts';

interface Placement {
  position: number;
  nickname: string;
  avatarId: string;
  value: number;
}

export class RankingStore {
  private readonly db: DatabaseSync;
  readonly classes: ClassStore;

  constructor(file: string) {
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA busy_timeout = 5000;
      PRAGMA foreign_keys = ON;
      PRAGMA secure_delete = ON;

      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        nickname TEXT NOT NULL,
        avatar TEXT NOT NULL,
        league INTEGER NOT NULL DEFAULT 0 CHECK (league BETWEEN 0 AND 2)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY,
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        proof TEXT NOT NULL,
        version TEXT NOT NULL,
        week TEXT NOT NULL,
        season TEXT NOT NULL,
        city TEXT,
        mission TEXT,
        ticks INTEGER NOT NULL,
        points INTEGER,
        series INTEGER,
        meters INTEGER,
        UNIQUE (profile_id, kind, proof)
      ) STRICT;
      CREATE INDEX IF NOT EXISTS runs_season ON runs (season, kind, mission, city, version);
      CREATE INDEX IF NOT EXISTS runs_week ON runs (week, city);
      CREATE TABLE IF NOT EXISTS weekly_xp (
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        week TEXT NOT NULL,
        xp REAL NOT NULL,
        PRIMARY KEY (week, profile_id)
      ) STRICT;
      CREATE INDEX IF NOT EXISTS xp_profile ON weekly_xp (profile_id);
    `);
    this.classes = new ClassStore(this.db, (op) => this.transaction(op));
  }

  close() {
    this.db.close();
  }

  private transaction<T>(op: () => T) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = op();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  // Call inside the transaction, so each finished week is applied once even after restart.
  private settleWeeks(week: string) {
    const past = this.db
      .prepare(
        'SELECT DISTINCT week FROM weekly_xp WHERE week < ? ORDER BY week',
      )
      .all(week);
    for (const { week: finished } of past) {
      const promote = this.db.prepare(`
        WITH places AS MATERIALIZED (
          SELECT p.id, ROW_NUMBER() OVER (PARTITION BY p.league ORDER BY w.xp DESC, p.id) AS place,
            COUNT(*) OVER (PARTITION BY p.league) AS players
          FROM weekly_xp AS w JOIN profiles AS p ON p.id = w.profile_id
          WHERE w.week = ? AND p.league < 2
        )
        UPDATE profiles SET league = league + 1
        WHERE id IN (SELECT id FROM places WHERE place <= (players + 4) / 5)
      `);
      promote.run(finished!);
      this.db.prepare('DELETE FROM weekly_xp WHERE week = ?').run(finished!);
    }
  }

  submit(
    profileId: string,
    { nickname, avatarId, score }: RankingSubmission,
    calendar: RankingCalendar,
  ) {
    return this.transaction(() => {
      this.settleWeeks(calendar.week);
      this.db
        .prepare(
          'INSERT OR IGNORE INTO profiles (id, nickname, avatar) VALUES (?, ?, ?)',
        )
        .run(profileId, nickname, avatarId);

      let changed;
      if (score.kind === 'weekly-xp') {
        changed = this.db
          .prepare(
            `
          INSERT INTO weekly_xp (profile_id, week, xp) VALUES (?, ?, ?)
          ON CONFLICT (week, profile_id) DO UPDATE SET xp = excluded.xp
          WHERE weekly_xp.xp < excluded.xp
        `,
          )
          .run(profileId, calendar.week, score.xp).changes;
      } else {
        const proof = createHash('sha256')
          .update(`${score.seed}:${score.inputHash}`)
          .digest('hex');
        changed = this.db
          .prepare(
            `
          INSERT INTO runs (profile_id, kind, proof, version, week, season, city, mission, ticks, points, series, meters)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (profile_id, kind, proof) DO NOTHING
        `,
          )
          .run(
            profileId,
            score.kind,
            proof,
            score.version,
            calendar.week,
            calendar.seasonKey,
            score.kind === 'plac' ? null : score.city,
            score.kind === 'mission' ? score.missionId : null,
            score.ticks,
            score.kind === 'mission' ? score.points : null,
            score.kind === 'plac' ? null : score.longestSeries,
            score.kind === 'plac' ? null : score.cleanMeters,
          ).changes;
      }
      if (changed)
        this.db
          .prepare('UPDATE profiles SET nickname = ?, avatar = ? WHERE id = ?')
          .run(nickname, avatarId, profileId);
      return Boolean(changed);
    });
  }

  deleteProfile(profileId: string, week: string) {
    this.transaction(() => {
      this.settleWeeks(week);
      this.classes.leave(profileId);
      this.db.prepare('DELETE FROM profiles WHERE id = ?').run(profileId);
    });
  }

  league(profileId: string | null, week: string): RankingLeague | null {
    return this.transaction(() => {
      this.settleWeeks(week);
      const profile = this.db
        .prepare('SELECT league FROM profiles WHERE id = ?')
        .get(profileId);
      return profile ? rankingLeague.options[Number(profile.league)]! : null;
    });
  }

  private placements(
    sql: string,
    args: (string | number)[],
    profileId: string | null,
    ascending = false,
  ) {
    const rows = this.db
      .prepare(
        `
      WITH candidates AS (${sql}), ranked AS (
        SELECT profileId, value, ROW_NUMBER() OVER (ORDER BY value ${ascending ? 'ASC' : 'DESC'}, tie, profileId) AS position
        FROM candidates
      )
      SELECT r.position, p.nickname, p.avatar AS avatarId, r.value, r.profileId = ? AS own
      FROM ranked AS r JOIN profiles AS p ON p.id = r.profileId
      WHERE r.position <= 50 OR r.profileId = ?
      ORDER BY r.position
    `,
      )
      .all(...args, profileId, profileId) as unknown as (Placement & {
      own: number | null;
    })[];
    const top: Placement[] = [];
    let self: Placement | null = null;
    for (const { own, ...entry } of rows) {
      if (entry.position <= 50) top.push(entry);
      if (own) self = entry;
    }
    return { top, self };
  }

  private cities(profileId: string | null, week: string) {
    const totals = this.db
      .prepare(
        `
      SELECT city, SUM(meters) AS value, SUM(CASE WHEN profile_id = ? THEN meters ELSE 0 END) AS own
      FROM runs WHERE week = ? AND meters > 0 GROUP BY city
    `,
      )
      .all(profileId, week) as unknown as {
      city: MissionCity;
      value: number;
      own: number;
    }[];
    const ranked = missionCity.options
      .map((city) => {
        const result = totals.find((row) => row.city === city);
        return { city, value: result?.value ?? 0, own: result?.own ?? 0 };
      })
      .sort((a, b) => b.value - a.value);

    const top = ranked.map(({ city, value }, index) => ({
      city,
      value,
      position: value === ranked[0]!.value ? 1 : index + 1,
    }));
    const self = ranked.flatMap(({ own }, i) =>
      own > 0 ? [{ ...top[i]!, contributedMeters: own }] : [],
    );
    return { top, self };
  }

  leaderboard(
    query: RankingQuery,
    profileId: string | null,
    calendar: RankingCalendar,
    rules: RankingRules,
  ) {
    if (query.board === 'cities') return this.cities(profileId, calendar.week);
    if (query.board === 'mission') {
      return this.placements(
        `SELECT profile_id AS profileId, MAX(points) AS value, MIN(id) AS tie
         FROM runs WHERE kind = 'mission' AND season = ? AND mission = ? AND city = ? AND version = ?
         GROUP BY profile_id`,
        [
          calendar.seasonKey,
          query.missionId,
          query.city,
          rules.missions[query.missionId]!.version,
        ],
        profileId,
      );
    }
    if (query.board === 'plac') {
      return this.placements(
        `SELECT profile_id AS profileId, MIN(ticks) AS value, MIN(id) AS tie
         FROM runs WHERE kind = 'plac' AND season = ? AND version = ? GROUP BY profile_id`,
        [calendar.seasonKey, rules.plac.version],
        profileId,
        true,
      );
    }
    if (query.board === 'safety') {
      return this.placements(
        `SELECT profile_id AS profileId, MAX(series) AS value, MIN(id) AS tie
         FROM runs WHERE season = ? AND series > 0 GROUP BY profile_id`,
        [calendar.seasonKey],
        profileId,
      );
    }
    return this.transaction(() => {
      this.settleWeeks(calendar.week);
      // Tie order must match league promotion. UUIDs stay in the database.
      return this.placements(
        `SELECT p.id AS profileId, w.xp AS value, 0 AS tie
         FROM weekly_xp AS w JOIN profiles AS p ON p.id = w.profile_id WHERE w.week = ? AND p.league = ?`,
        [calendar.week, rankingLeague.options.indexOf(query.league)],
        profileId,
      );
    });
  }
}
