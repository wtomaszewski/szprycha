import { createHmac, randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { rankingProfileId } from '../../src/content/rankings.ts';

const maxBody = 4096;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

export function send(res: ServerResponse, status: number, value?: unknown) {
  res.statusCode = status;
  if (value === undefined) res.end();
  else {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(value));
  }
}

export function profileIdOf(req: IncomingMessage) {
  if (req.headers.authorization === undefined) return null;
  const parsed = rankingProfileId.safeParse(
    /^Bearer (\S+)$/i.exec(req.headers.authorization)?.[1],
  );
  if (!parsed.success) throw new HttpError(401, 'invalid_profile');
  return parsed.data;
}

export async function json(req: IncomingMessage) {
  if (
    req.headers['content-type']?.split(';')[0]?.trim().toLowerCase() !==
    'application/json'
  )
    throw new HttpError(415, 'json_required');
  if (Number(req.headers['content-length']) > maxBody)
    throw new HttpError(413, 'body_too_large');
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of req.iterator({
    destroyOnReturn: false,
  }) as AsyncIterable<Buffer>) {
    length += chunk.length;
    if (length > maxBody) throw new HttpError(413, 'body_too_large');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)),
    ) as unknown;
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
}

export function rateLimit(limit: number) {
  let key = randomBytes(32);
  let windowEnd = 0;
  const counts = new Map<string, number>();
  return (address: string, now: number) => {
    if (now >= windowEnd) {
      counts.clear();
      key = randomBytes(32);
      windowEnd = now + 60_000;
      const expires = windowEnd;
      setTimeout(() => {
        if (windowEnd === expires) {
          counts.clear();
          key = randomBytes(32);
        }
      }, 60_000).unref();
    }
    const bucket = createHmac('sha256', key).update(address).digest('hex');
    const count = counts.get(bucket) ?? 0;
    if (count >= limit || (count === 0 && counts.size >= 10_000))
      return Math.max(1, Math.ceil((windowEnd - now) / 1000));
    counts.set(bucket, count + 1);
    return 0;
  };
}
