import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ZodType } from 'zod';
import {
  classId,
  classJoin,
  classUpdate,
  newClass,
  teacherCredentials,
  teacherRegistration,
  teacherToken,
} from '../../src/content/classes.ts';
import type { ClassStore } from './classes.ts';
import {
  HttpError,
  json,
  profileIdOf,
  rateLimit,
  send,
} from './httpSupport.ts';

type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<void> | void;
const routes = {
  '/v1/teacher/register': ['POST'],
  '/v1/teacher/login': ['POST'],
  '/v1/teacher/session': ['DELETE'],
  '/v1/teacher/account': ['DELETE'],
  '/v1/teacher/classes': ['GET', 'POST'],
  '/v1/class/join': ['POST'],
  '/v1/class/membership': ['GET', 'DELETE'],
  '/v1/class/progress': ['PUT'],
  '/v1/class/board': ['GET'],
} as const satisfies Record<string, readonly string[]>;

function parseClassPath(path: string) {
  const match = /^\/v1\/teacher\/classes\/([^/]+)(?:\/(code|reset))?$/.exec(
    path,
  );
  if (!match) return;
  const parsed = classId.safeParse(match[1]);
  if (!parsed.success) return;
  const action = match[2];
  return {
    id: parsed.data,
    action,
    methods:
      action === 'code'
        ? ['POST', 'DELETE']
        : action === 'reset'
          ? ['POST']
          : ['GET', 'DELETE'],
  };
}

async function body<T>(req: IncomingMessage, schema: ZodType<T>) {
  const parsed = schema.safeParse(await json(req));
  if (!parsed.success) throw new HttpError(400, 'invalid_class_request');
  return parsed.data;
}

function passwordHash(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      Buffer.from(salt, 'hex'),
      64,
      {
        N: 32768,
        r: 8,
        p: 3,
        maxmem: 64 * 1024 * 1024,
      },
      (error, hash) => (error ? reject(error) : resolve(hash)),
    );
  });
}

function limit(
  req: IncomingMessage,
  res: ServerResponse,
  rate: ReturnType<typeof rateLimit>,
) {
  const retry = rate(req.socket.remoteAddress ?? '', Date.now());
  if (retry) {
    res.setHeader('Retry-After', retry);
    throw new HttpError(429, 'rate_limited');
  }
}

export function classRoutes(store: ClassStore, now: () => Date) {
  const limitAuth = rateLimit(30);
  const limitJoin = rateLimit(60);
  const dummySalt = randomBytes(16).toString('hex');
  let passwordJobs = 0;

  const authenticate = async (
    req: IncomingMessage,
    res: ServerResponse,
    register: boolean,
  ) => {
    limit(req, res, limitAuth);
    const { email, password } = await body(
      req,
      register ? teacherRegistration : teacherCredentials,
    );
    if (passwordJobs >= 4) {
      res.setHeader('Retry-After', 2);
      throw new HttpError(429, 'rate_limited');
    }
    const account = register ? undefined : store.account(email);
    const salt = register
      ? randomBytes(16).toString('hex')
      : (account?.salt ?? dummySalt);
    passwordJobs++;
    let hash: Buffer;
    try {
      hash = await passwordHash(password, salt);
    } finally {
      passwordJobs--;
    }
    const token = randomBytes(32).toString('hex');
    if (register) {
      if (
        !store.register(
          email,
          salt,
          hash.toString('hex'),
          token,
          now().getTime(),
        )
      )
        throw new HttpError(409, 'account_unavailable');
    } else if (
      !timingSafeEqual(
        hash,
        account ? Buffer.from(account.hash, 'hex') : Buffer.alloc(64),
      ) ||
      !account ||
      !store.issueSession(account.id, token, now().getTime())
    )
      throw new HttpError(401, 'invalid_credentials');
    send(res, register ? 201 : 200, { token });
  };

  return (
    path: string,
  ): { methods: readonly string[]; handle: Handler } | undefined => {
    const scoped = parseClassPath(path);
    const methods =
      scoped?.methods ??
      (Object.hasOwn(routes, path)
        ? routes[path as keyof typeof routes]
        : undefined);
    if (!methods) return;

    return {
      methods,
      async handle(req, res) {
        if (path === '/v1/teacher/register' || path === '/v1/teacher/login')
          return authenticate(req, res, path === '/v1/teacher/register');
        if (path.startsWith('/v1/teacher/')) {
          const token = teacherToken.safeParse(
            /^Bearer (\S+)$/i.exec(req.headers.authorization ?? '')?.[1],
          );
          if (!token.success) throw new HttpError(401, 'teacher_required');
          const teacher = store.teacher(token.data, now().getTime());
          if (!teacher) throw new HttpError(401, 'teacher_required');
          if (path === '/v1/teacher/session') {
            store.endSession(token.data);
            return send(res, 204);
          }
          if (path === '/v1/teacher/account') {
            store.deleteTeacher(teacher.id);
            return send(res, 204);
          }
          if (path === '/v1/teacher/classes') {
            if (req.method === 'GET')
              return send(res, 200, store.classes(teacher.id));
            const { name } = await body(req, newClass);
            // Parsing the body yields control, so check that this session still exists.
            if (!store.teacher(token.data, now().getTime()))
              throw new HttpError(401, 'teacher_required');
            return send(res, 201, store.create(teacher.id, name));
          }
          if (scoped) {
            const { id, action } = scoped;
            if (action === 'code') {
              const info = store.setCode(teacher.id, id, req.method === 'POST');
              if (info) return send(res, 200, info);
            } else if (action === 'reset') {
              if (store.reset(teacher.id, id)) return send(res, 204);
            } else if (req.method === 'GET') {
              const board = store.teacherBoard(teacher.id, id);
              if (board) return send(res, 200, board);
            } else if (store.deleteClass(teacher.id, id)) return send(res, 204);
          }
          throw new HttpError(404, 'class_not_found');
        }

        const profile = profileIdOf(req);
        if (!profile) throw new HttpError(401, 'profile_required');
        if (path === '/v1/class/join') {
          limit(req, res, limitJoin);
          const { code, ...progress } = await body(req, classJoin);
          const join = store.join(profile, code, progress);
          if (join.status === 'closed')
            throw new HttpError(404, 'invalid_code');
          if (join.status === 'other_class' || join.status === 'full')
            throw new HttpError(409, join.status);
          return send(res, join.status === 'joined' ? 201 : 200, {
            memberId: join.memberId,
          });
        }
        if (path === '/v1/class/membership') {
          if (req.method === 'DELETE') {
            store.leave(profile);
            return send(res, 204);
          }
          const memberId = store.member(profile)?.id;
          return memberId ? send(res, 200, { memberId }) : send(res, 204);
        }
        if (path === '/v1/class/progress') {
          const { memberId, ...progress } = await body(req, classUpdate);
          if (store.update(profile, memberId, progress)) return send(res, 204);
        } else {
          const board = store.studentBoard(profile);
          if (board) return send(res, 200, board);
        }
        throw new HttpError(404, 'membership_not_found');
      },
    };
  };
}
