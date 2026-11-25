import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readLines } from './lines.ts';
import {
  audioDirectory,
  formatSchema,
  formats,
  hash,
  readAudio,
  readManifest,
  type Manifest,
} from './manifest.ts';

const budgetMiB = 40;
const strictByDefault = false; // Włączyć przed wydaniem 1.0.

export async function checkVoice(root: string, lines: Manifest['lines']) {
  const audio = audioDirectory(root);
  const [manifest, entries] = await Promise.all([
    readManifest(root),
    readdir(audio).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
      return [];
    }),
  ]);
  let bytes = 0;
  const issues = new Map<string, string[]>();
  function flag(reason: string, id: string) {
    const ids = issues.get(reason);
    if (ids) ids.push(id);
    else issues.set(reason, [id]);
  }
  const files = new Map<string, string>();
  for (const name of entries.sort()) {
    const dot = name.lastIndexOf('.');
    const format = formatSchema.safeParse(name.slice(dot + 1));
    if (!format.success || dot < 0) continue;
    const data = await readAudio(join(audio, name));
    if (data?.length) {
      bytes += data.length;
      files.set(name, hash(data));
    }
    if (!Object.hasOwn(lines, name.slice(0, dot)))
      flag('Pliki bez kwestii', name);
  }

  for (const [id, line] of Object.entries(lines)) {
    if (
      manifest.lines[id]?.hash !== line.hash ||
      manifest.lines[id]?.text !== line.text
    )
      flag('Manifest do odświeżenia', id);
    const recording = manifest.recorded[id];
    if (recording && recording.hash !== line.hash)
      flag('Nieaktualne nagrania', id);
    for (const ext of formats) {
      const name = `${id}.${ext}`;
      const digest = files.get(name);
      if (!digest) flag('Brakujące lub puste pliki', name);
      else if (digest !== recording?.files[ext])
        flag('Pliki z niezgodnym lub brakującym hashem', name);
    }
  }
  for (const id of new Set([
    ...Object.keys(manifest.lines),
    ...Object.keys(manifest.recorded),
  ]))
    if (!Object.hasOwn(lines, id)) flag('Wpisy bez kwestii', id);

  const mib = bytes / 1024 ** 2;
  if (mib > budgetMiB)
    flag('Przekroczono budżet nagrań', `${mib.toFixed(2)} MiB`);
  return { mib, issues, count: Object.keys(lines).length };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  async function main() {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length && args[0] !== '--strict'))
      throw new Error('Użycie: npm run voice:check [-- --strict]');
    const strict = strictByDefault || args[0] === '--strict';
    const root = process.cwd();
    const { mib, issues, count } = await checkVoice(
      root,
      await readLines(root),
    );
    console.log(
      `Lektor: ${count} kwestii, ${mib.toFixed(2)} MiB audio / ${budgetMiB} MiB budżetu.`,
    );
    const level = strict ? 'error' : 'warning';
    for (const [reason, ids] of issues) {
      console.warn(
        `${process.env.GITHUB_ACTIONS ? `::${level}::` : `${level}: `}${reason} (${ids.length}).`,
      );
      if (process.env.GITHUB_ACTIONS) console.log(`::group::${reason}`);
      for (const id of ids) console.log(`  ${id}`);
      if (process.env.GITHUB_ACTIONS) console.log('::endgroup::');
    }
    if (strict && issues.size) process.exitCode = 1;
  }
  void main().catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : 'Błąd kontroli nagrań.',
    );
    process.exitCode = 1;
  });
}
