const timeoutMs = 5_000;

export class RankingHttpError extends Error {
  constructor(readonly status: number) {
    super(`Ranking API returned ${status}`);
  }
}

export async function rankingRequest(
  base: URL,
  path: string,
  init: RequestInit,
  token?: string,
  fetcher = globalThis.fetch.bind(globalThis),
) {
  const headers = new Headers();
  if (token) headers.set('Authorization', 'Bearer ' + token);
  if (init.body) headers.set('Content-Type', 'application/json');
  const timeout = AbortSignal.timeout(timeoutMs);
  const response = await fetcher(new URL(path.slice(1), base), {
    ...init,
    headers,
    signal: init.signal ? AbortSignal.any([timeout, init.signal]) : timeout,
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) throw new RankingHttpError(response.status);
  return response;
}
