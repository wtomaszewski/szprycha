import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { auditNativeLicenses } from '../../tools/check-native-licenses.ts';
import { buildThirdPartyNotices } from '../../tools/check-licenses.ts';

const allowed = new Set(['Apache-2.0', 'MIT']);
const library = {
  coordinate: 'example:library',
  version: '1.0.0',
  scope: 'runtime',
  licenses: ['Apache-2.0'],
  source: 'https://example.com/library',
};
const swift = {
  coordinate: 'https://example.com/bridge.git',
  version: '2.0.0',
  scope: 'runtime',
  licenses: ['MIT'],
  source: 'https://example.com/bridge',
};
let root: string;
function write(path: string, text: string) {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}
function manifest(dependencies: unknown[]) {
  write(
    'licenses/native-deps.json',
    JSON.stringify({
      androidReleaseReviewed: true,
      dependencies,
    }),
  );
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'szprycha-native-licenses-'));
  write('package-lock.json', '{"packages":{}}');
  write('android/capacitor.settings.gradle', '');
  write('android/variables.gradle', "ext {\n    libraryVersion = '1.0.0'\n}");
  write(
    'android/app/build.gradle',
    'dependencies {\n    implementation "example:library:$libraryVersion"\n}',
  );
  write('node_modules/@capacitor/android/capacitor/build.gradle', '');
  write(
    'ios/App/CapApp-SPM/Package.swift',
    '.package(url: "https://example.com/bridge.git", exact: "2.0.0")',
  );
  manifest([library, swift]);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

it('rejects a new Gradle dependency absent from the manifest', () => {
  expect(auditNativeLicenses(root, allowed).errors).toEqual([]);
  write(
    'android/new-module/build.gradle',
    'dependencies { implementation("example:unlisted:1.0.0") }',
  );
  expect(auditNativeLicenses(root, allowed).errors).toEqual([
    'android/new-module/build.gradle: missing native manifest declaration for example:unlisted',
  ]);
});

it('checks both Gradle variables and the exact Swift package version', () => {
  manifest([
    { ...library, version: '0.9.0' },
    { ...swift, version: '1.0.0' },
  ]);
  expect(auditNativeLicenses(root, allowed).errors).toEqual([
    'android/app/build.gradle: example:library requires 1.0.0; manifest has 0.9.0',
    'ios/App/CapApp-SPM/Package.swift: https://example.com/bridge.git requires 2.0.0; manifest has 1.0.0',
  ]);
});

it('rejects disallowed licenses and treats unverified licenses as errors in strict mode', () => {
  manifest([
    { ...library, licenses: ['GPL-3.0-only'] },
    { ...swift, licenses: null },
  ]);
  const regular = auditNativeLicenses(root, allowed);
  const strict = auditNativeLicenses(root, allowed, { strict: true });
  expect(regular.errors).toEqual([
    'example:library: GPL-3.0-only is outside the approved license list',
  ]);
  expect(regular.warnings).toEqual([
    'https://example.com/bridge.git: license needs review',
  ]);
  expect(strict.errors).toEqual([...regular.errors, ...regular.warnings]);
});

it('compares resolved runtime versions and checks for new transitives in a Gradle report', () => {
  manifest([{ ...library, resolvedVersion: '1.1.0' }, swift]);
  const gradleReport =
    'releaseRuntimeClasspath - release\n+--- example:library:1.0.0 -> 1.1.0\n\\--- example:unlisted:1.2.0\n';
  expect(auditNativeLicenses(root, allowed, { gradleReport }).errors).toEqual([
    'Gradle resolved example:unlisted:1.2.0; manifest has no entry',
  ]);
  expect(
    auditNativeLicenses(root, allowed, {
      gradleReport: gradleReport.replace('1.1.0', 'FAILED'),
    }).errors,
  ).toEqual([
    'Expected a fully resolved Gradle releaseRuntimeClasspath report',
  ]);
});

it('includes native dependency versions, attributions and full license texts in the mobile notices', () => {
  const notices = buildThirdPartyNotices(process.cwd(), true);
  expect(notices).toContain(
    'androidx.appcompat:appcompat @ 1.7.1 (Apache-2.0)',
  );
  expect(notices).toContain('capacitor-swift-pm.git @ 8.6.2 (MIT, Apache-2.0)');
  expect(notices).toContain(
    'org.jetbrains.kotlin:kotlin-stdlib @ 2.0.21 (Apache-2.0)',
  );
  expect(notices).toContain('The Apache Software Foundation');
  expect(notices).toContain(
    'TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION',
  );
  expect(notices).toContain('Copyright (c) 2017-present Drifty Co.');
  expect(notices).not.toContain('com.android.tools.build:gradle');
  expect(buildThirdPartyNotices(process.cwd())).not.toContain(
    'THIRD_PARTY_NOTICES_MOBILE',
  );
});
