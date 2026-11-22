import { createHash, randomInt, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import {
  classCodeAlphabet,
  classCodeLength,
  type ClassInfo,
  type ClassProgress,
  type ClassTotals,
} from '../../src/content/classes.ts';
import { moduleId } from '../../src/content/schemas.ts';

interface Account {
  id: string;
  salt: string;
  hash: string;
}

interface Member {
  id: string;
  classId: string;
}

interface Row {
  id: string;
  nickname: string;
  xp: number;
  mastery: string;
  baseline: string | null;
}

const maxClassSize = 100;
const sessionLength = 12 * 60 * 60 * 1000;
const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export class ClassStore {
  constructor(
    private readonly db: DatabaseSync,
    private readonly transaction: <T>(op: () => T) => T,
  ) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        salt TEXT NOT NULL,
        hash TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS teacher_sessions (
        token_hash TEXT PRIMARY KEY,
        teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        expires INTEGER NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS teacher_sessions_owner ON teacher_sessions (teacher_id);
      CREATE INDEX IF NOT EXISTS teacher_sessions_expiry ON teacher_sessions (expires);

      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        code TEXT UNIQUE,
        has_reset INTEGER NOT NULL DEFAULT 0 CHECK (has_reset IN (0, 1))
      ) STRICT;
      CREATE INDEX IF NOT EXISTS classes_owner ON classes (teacher_id);
      CREATE TABLE IF NOT EXISTS class_members (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        profile_id TEXT NOT NULL UNIQUE,
        nickname TEXT NOT NULL,
        xp REAL NOT NULL,
        mastery TEXT NOT NULL,
        baseline_xp REAL NOT NULL DEFAULT 0,
        baseline_mastery TEXT
      ) STRICT;
      CREATE INDEX IF NOT EXISTS class_members_class ON class_members (class_id);
    `);
  }

  account(email: string) {
    return this.db
      .prepare('SELECT id, salt, hash FROM teachers WHERE email = ?')
      .get(email) as Account | undefined;
  }

  register(
    email: string,
    salt: string,
    hash: string,
    token: string,
    now: number,
  ) {
    return this.transaction(() => {
      const id = randomUUID();
      const { changes } = this.db
        .prepare(
          'INSERT INTO teachers (id, email, salt, hash) VALUES (?, ?, ?, ?) ON CONFLICT (email) DO NOTHING',
        )
        .run(id, email, salt, hash);
      if (!changes) return false;
      return this.issueSession(id, token, now);
    });
  }

  issueSession(id: string, token: string, now: number) {
    this.db.prepare('DELETE FROM teacher_sessions WHERE expires <= ?').run(now);
    return Boolean(
      this.db
        .prepare(
          `
      INSERT INTO teacher_sessions (token_hash, teacher_id, expires)
      SELECT ?, id, ? FROM teachers WHERE id = ?
    `,
        )
        .run(digest(token), now + sessionLength, id).changes,
    );
  }

  teacher(token: string, now: number) {
    return this.db
      .prepare(
        'SELECT teacher_id AS id FROM teacher_sessions WHERE token_hash = ? AND expires > ?',
      )
      .get(digest(token), now) as { id: string } | undefined;
  }

  endSession(token: string) {
    this.db
      .prepare('DELETE FROM teacher_sessions WHERE token_hash = ?')
      .run(digest(token));
  }

  deleteTeacher(teacher: string) {
    this.db.prepare('DELETE FROM teachers WHERE id = ?').run(teacher);
  }

  classes(teacher: string) {
    return this.db
      .prepare(
        'SELECT id, name, code FROM classes WHERE teacher_id = ? ORDER BY name, id',
      )
      .all(teacher) as unknown as ClassInfo[];
  }

  create(teacher: string, name: string) {
    return this.transaction(() => {
      const info = { id: randomUUID(), code: this.availableCode(), name };
      this.db
        .prepare(
          'INSERT INTO classes (id, teacher_id, name, code) VALUES (?, ?, ?, ?)',
        )
        .run(info.id, teacher, name, info.code);
      return info;
    });
  }

  private availableCode() {
    for (;;) {
      const code = Array.from(
        { length: classCodeLength },
        () => classCodeAlphabet[randomInt(classCodeAlphabet.length)],
      ).join('');
      if (!this.db.prepare('SELECT 1 FROM classes WHERE code = ?').get(code))
        return code;
    }
  }

  setCode(teacher: string, id: string, open: boolean) {
    return this.transaction(
      () =>
        this.db
          .prepare(
            'UPDATE classes SET code = ? WHERE teacher_id = ? AND id = ? RETURNING id, name, code',
          )
          .get(open ? this.availableCode() : null, teacher, id) as
          ClassInfo | undefined,
    );
  }

  deleteClass(teacher: string, id: string) {
    return Boolean(
      this.db
        .prepare('DELETE FROM classes WHERE teacher_id = ? AND id = ?')
        .run(teacher, id).changes,
    );
  }

  reset(teacher: string, id: string) {
    return this.transaction(() => {
      const classroom = this.db
        .prepare(
          'UPDATE classes SET has_reset = 1 WHERE teacher_id = ? AND id = ?',
        )
        .run(teacher, id);
      if (!classroom.changes) return false;
      this.db
        .prepare(
          `
        UPDATE class_members SET baseline_xp = xp, baseline_mastery = mastery WHERE class_id = ?
      `,
        )
        .run(id);
      return true;
    });
  }

  private ownedClass(teacher: string, id: string) {
    return this.db
      .prepare(
        'SELECT id, name, code FROM classes WHERE teacher_id = ? AND id = ?',
      )
      .get(teacher, id) as ClassInfo | undefined;
  }

  member(profile: string) {
    return this.db
      .prepare(
        'SELECT id, class_id AS classId FROM class_members WHERE profile_id = ?',
      )
      .get(profile) as Member | undefined;
  }

  join(profile: string, code: string, progress: ClassProgress) {
    return this.transaction(() => {
      const classroom = this.db
        .prepare('SELECT id, has_reset AS hasReset FROM classes WHERE code = ?')
        .get(code) as { id: string; hasReset: number } | undefined;
      if (!classroom) return { status: 'closed' } as const;
      const existing = this.member(profile);
      if (existing)
        return existing.classId === classroom.id
          ? ({ status: 'already_joined', memberId: existing.id } as const)
          : ({ status: 'other_class' } as const);
      const size = this.db
        .prepare(
          'SELECT COUNT(*) AS size FROM class_members WHERE class_id = ?',
        )
        .get(classroom.id)!.size as number;
      if (size >= maxClassSize) return { status: 'full' } as const;
      const memberId = randomUUID();
      const mastery = JSON.stringify(progress.mastery);
      this.db
        .prepare(
          `
          INSERT INTO class_members (id, class_id, profile_id, nickname, xp, mastery, baseline_xp, baseline_mastery)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .run(
          memberId,
          classroom.id,
          profile,
          progress.nickname,
          progress.xp,
          mastery,
          classroom.hasReset ? progress.xp : 0,
          classroom.hasReset ? mastery : null,
        );
      return { status: 'joined', memberId } as const;
    });
  }

  leave(profile: string) {
    this.db
      .prepare('DELETE FROM class_members WHERE profile_id = ?')
      .run(profile);
  }

  update(profile: string, memberId: string, progress: ClassProgress) {
    return Boolean(
      this.db
        .prepare(
          `
      UPDATE class_members SET nickname = ?, xp = MAX(xp, ?), mastery = ? WHERE profile_id = ? AND id = ?
    `,
        )
        .run(
          progress.nickname,
          progress.xp,
          JSON.stringify(progress.mastery),
          profile,
          memberId,
        ).changes,
    );
  }

  private rows(classId: string) {
    const rows = this.db
      .prepare(
        `
      SELECT id, nickname, MAX(0, xp - baseline_xp) AS xp, mastery, baseline_mastery AS baseline
      FROM class_members WHERE class_id = ? ORDER BY xp DESC, id
    `,
      )
      .all(classId) as unknown as Row[];
    return rows.map(({ id, nickname, xp, mastery, baseline }, index) => {
      const current = JSON.parse(mastery) as ClassTotals['mastery'];
      const prior = baseline
        ? (JSON.parse(baseline) as ClassTotals['mastery'])
        : undefined;
      for (const module of moduleId.options)
        current[module] = Math.max(0, current[module] - (prior?.[module] ?? 0));
      return {
        memberId: id,
        position: index + 1,
        nickname,
        xp,
        mastery: current,
      };
    });
  }

  teacherBoard(teacher: string, id: string) {
    // Ownership and the roster are read in the same snapshot.
    return this.transaction(() => {
      const info = this.ownedClass(teacher, id);
      return info && { ...info, rows: this.rows(id) };
    });
  }

  studentBoard(profile: string) {
    return this.transaction(() => {
      const member = this.member(profile);
      if (!member) return;
      const rows = this.rows(member.classId);
      const index = rows.findIndex(({ memberId }) => memberId === member.id);
      const publicRow = ({
        position,
        nickname,
        xp,
        mastery,
      }: (typeof rows)[number]) => ({ position, nickname, xp, mastery });
      return {
        top: rows.slice(0, 50).map(publicRow),
        self: publicRow(rows[index]!),
      };
    });
  }
}
