import { expect, it } from 'vitest';
import { parentZoneConfig } from '../src/platform/parentZoneConfig';

it('keeps online controls and external links hidden with no build configuration', () => {
  expect(parentZoneConfig({})).toEqual({
    rankingAvailable: false,
    privacyUrl: undefined,
    projectUrl: undefined,
  });
  expect(
    parentZoneConfig({
      VITE_RANKING_URL: ' ',
      VITE_PRIVACY_POLICY_URL: '',
      VITE_PROJECT_URL: '  ',
    }),
  ).toEqual(parentZoneConfig({}));
});

it('allows configured HTTPS and excludes addresses with unsafe schemes or credentials', () => {
  expect(
    parentZoneConfig({
      VITE_RANKING_URL: 'https://rankings.example/',
      VITE_PRIVACY_POLICY_URL: ' https://project.example/privacy ',
      VITE_PROJECT_URL: 'https://project.example/',
    }),
  ).toEqual({
    rankingAvailable: true,
    privacyUrl: 'https://project.example/privacy',
    projectUrl: 'https://project.example/',
  });
  expect(
    parentZoneConfig({
      VITE_RANKING_URL: 'https://user:password@rankings.example/',
      VITE_PRIVACY_POLICY_URL: 'javascript:alert(1)',
      VITE_PROJECT_URL: '/local',
    }),
  ).toEqual(parentZoneConfig({}));
  expect(
    parentZoneConfig({
      VITE_RANKING_URL: 'http://localhost:1234/',
    }).rankingAvailable,
  ).toBe(true);
});
