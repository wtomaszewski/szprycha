import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { serverConfig } from './config.ts';
import { createRankingServer } from './http.ts';
import type { RankingRules } from './rules.ts';
import { RankingStore } from './store.ts';

async function start() {
  process.umask(0o077);
  const config = serverConfig(process.env);
  const rules = JSON.parse(
    await readFile(new URL('./rules.json', import.meta.url), 'utf8'),
  ) as RankingRules;
  if (config.database !== ':memory:')
    await mkdir(dirname(config.database), { recursive: true });
  const store = new RankingStore(config.database);
  const server = createRankingServer({ ...config, store, rules });
  server.once('error', () => {
    console.error('Ranking server could not listen');
    store.close();
    process.exitCode = 1;
  });
  server.once('close', () => store.close());
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close());
  }
  server.listen(config.port, config.host, () =>
    console.log('Ranking server ready'),
  );
}

start().catch(() => {
  console.error(
    'Ranking server could not start. Check configuration, build and data directory.',
  );
  process.exitCode = 1;
});
