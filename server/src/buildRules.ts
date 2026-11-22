import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildRankingRules } from '../../tools/ranking-rules.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
await writeFile(
  new URL('../dist/rules.json', import.meta.url),
  JSON.stringify(await buildRankingRules(root)),
);
