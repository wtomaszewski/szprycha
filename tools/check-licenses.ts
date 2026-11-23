import { localFonts } from './font-coverage.ts';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const allowed = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'ISC',
  'MIT',
  'Unlicense',
  'Zlib',
]);

type Manifest = {
  name: string;
  version: string;
  license?: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
};

function readManifest(file: string): Manifest | undefined {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Manifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

function findPackage(
  modules: string,
  install: string,
  from: string,
  name: string,
) {
  const lookup =
    createRequire(from).resolve.paths(name + '/package.json') ?? [];
  for (const directory of lookup) {
    const path = relative(install, directory);
    // Packages in a symlinked node_modules resolve their children from its target.
    if (
      directory !== modules &&
      (isAbsolute(path) || path === '..' || path.startsWith('..' + sep))
    )
      continue;
    // Reading the manifest directly also works when "exports" hides package.json.
    const file = resolve(directory, name, 'package.json');
    const manifest = readManifest(file);
    if (manifest) return { file: realpathSync(file), manifest };
  }
}

function collect(
  root: string,
  entry: string,
  manifest: Manifest,
  dev: boolean,
  exclude: ReadonlySet<string> = new Set(),
) {
  const modules = resolve(root, 'node_modules');
  const install = existsSync(modules) ? realpathSync(modules) : modules;
  const packages = new Map<string, Manifest>();
  const missing = new Set<string>();
  const pending = [{ file: entry, manifest }];
  for (const pkg of pending) {
    const optional = pkg.manifest.optionalDependencies ?? {};
    const peers = pkg.manifest.peerDependencies ?? {};
    const dependencies =
      pkg.file === entry && dev
        ? pkg.manifest.devDependencies
        : { ...peers, ...pkg.manifest.dependencies, ...optional };
    for (const name of Object.keys(dependencies ?? {})) {
      const found = findPackage(modules, install, pkg.file, name);
      if (!found) {
        const optionalPeer =
          Object.hasOwn(peers, name) &&
          !Object.hasOwn(pkg.manifest.dependencies ?? {}, name) &&
          pkg.manifest.peerDependenciesMeta?.[name]?.optional;
        if (Object.hasOwn(optional, name) || optionalPeer) continue;
        missing.add(`${name} (required by ${pkg.manifest.name})`);
      } else if (!exclude.has(found.file) && !packages.has(found.file)) {
        packages.set(found.file, found.manifest);
        pending.push(found);
      }
    }
  }

  const entries = [...packages].map(([file, pkg]) => ({
    directory: dirname(file),
    label: `${pkg.name}@${pkg.version}`,
    license:
      typeof pkg.license === 'string' && pkg.license.trim()
        ? pkg.license.trim()
        : 'UNKNOWN',
  }));
  entries.sort(
    (a, b) =>
      a.label.localeCompare(b.label) || a.directory.localeCompare(b.directory),
  );
  return {
    entries,
    missing: [...missing].sort(),
    files: new Set(packages.keys()),
  };
}

function auditLicenses(root: string, includeDev = false, workspace = '.') {
  root = realpathSync(root);
  const entry = resolve(root, workspace, 'package.json');
  const manifest = readManifest(entry);
  if (!manifest) throw new Error(`Missing manifest: ${entry}`);
  const production = collect(root, entry, manifest, false);
  const development = includeDev
    ? collect(root, entry, manifest, true, production.files)
    : { entries: [], missing: [] };
  return { production, development };
}

function violations({
  entries,
  missing,
}: Pick<ReturnType<typeof collect>, 'entries' | 'missing'>) {
  return [
    ...missing.map((dependency) => `Missing package: ${dependency}`),
    ...entries
      .filter(({ license }) => !allowed.has(license))
      .map(
        ({ label, license }) =>
          `${label}: ${license} is outside the approved license list`,
      ),
  ];
}

function noticeFiles(directory: string) {
  return readdirSync(directory, { withFileTypes: true })
    .filter(
      (file) =>
        file.isFile() &&
        /^(licen[cs]es?|copying|copyright|notices?)([._-].*)?$/i.test(
          file.name,
        ),
    )
    .map(({ name }) => name)
    .sort();
}

function readNotice(path: string) {
  const body = readFileSync(path, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (!body.trim()) throw new Error(`Empty license or notice: ${path}`);
  return body;
}

export function buildThirdPartyNotices(root: string) {
  const audit = auditLicenses(root);
  const errors = violations(audit.production);
  if (errors.length) throw new Error(errors.join('\n'));

  const sections = new Set<string>();
  for (const { directory, label, license } of audit.production.entries) {
    const files = noticeFiles(directory);
    if (!files.some((name) => /^(licen[cs]e|copying)/i.test(name))) {
      throw new Error(`Missing license text for ${label}`);
    }
    const texts = files.map((name) => readNotice(resolve(directory, name)));
    if (label.startsWith('phaser@')) {
      const version = label.slice('phaser@'.length);
      texts.push(
        readNotice(resolve(root, 'assets/licenses', `phaser-${version}.txt`)),
      );
    }
    sections.add([`${label} (${license})`, ...texts].join('\n\n'));
  }
  if (
    audit.production.entries.some(({ license }) => license === 'Apache-2.0')
  ) {
    sections.add(readNotice(resolve(root, 'assets/licenses/Apache-2.0.txt')));
  }
  for (const { family, directory } of localFonts) {
    sections.add(
      `${family} (OFL-1.1)\n\n` +
        readNotice(resolve(root, 'assets/fonts', directory, 'OFL.txt')),
    );
  }
  return `THIRD_PARTY_NOTICES\n\n${[...sections].join('\n\n' + '='.repeat(48) + '\n\n')}\n`;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const audit = auditLicenses(process.cwd(), true);
  const serverManifest = resolve(process.cwd(), 'server/package.json');
  const server = existsSync(serverManifest)
    ? auditLicenses(process.cwd(), false, 'server').production
    : { entries: [], missing: [] };
  for (const [scope, tree] of Object.entries({ ...audit, server })) {
    console.log(`\n${scope} (${tree.entries.length} installed packages)`);
    for (const { label, license } of tree.entries)
      console.log(`  ${label}: ${license}`);
  }

  for (const warning of violations(audit.development))
    console.warn(`WARNING (development): ${warning}`);
  const errors = violations(audit.production);
  for (const error of errors) console.error(`ERROR (production): ${error}`);
  const serverErrors = violations(server);
  for (const error of serverErrors) console.error(`ERROR (server): ${error}`);
  if (errors.length || serverErrors.length) process.exitCode = 1;
}
