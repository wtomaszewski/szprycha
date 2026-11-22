import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { version } from '../../package.json';
import lockfile from '../../package-lock.json';

it('uses the package version in the lockfile and every native build configuration', () => {
  const android = readFileSync('android/app/build.gradle', 'utf8');
  const ios = readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8');
  const androidVersions = [
    ...android.matchAll(/^\s*versionName\s+"([^"]+)"/gm),
  ].map((match) => match[1]);
  const iosVersions = [
    ...ios.matchAll(/^\s*MARKETING_VERSION\s*=\s*([^;]+);/gm),
  ].map((match) => match[1]?.trim());

  expect(lockfile.version).toBe(version);
  expect(lockfile.packages[''].version).toBe(version);
  expect(androidVersions).toEqual([version]);
  expect(iosVersions).toEqual([version, version]);
});
