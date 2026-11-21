import { expect, it } from 'vitest';
import {
  canRide,
  stepRider,
  type Rider,
  type Obstacle,
} from '../src/gameplay/bicycle';
const start = (): Rider => ({
  x: 100,
  y: 100,
  speed: 0,
  heading: 0,
  walking: false,
});
const drive = { x: 0, y: -1, brake: false, scheme: 'classic' as const };
it('accelerates, steers, and brakes to a stop', () => {
  const r = start();
  for (let i = 0; i < 120; i++) stepRider(r, drive, [], 1000, 1000);
  expect(r.speed).toBeCloseTo(140);
  expect(r.x).toBeGreaterThan(200);
  stepRider(r, { ...drive, x: 1 }, [], 1000, 1000);
  expect(r.heading).toBeGreaterThan(0);
  for (let i = 0; i < 60; i++)
    stepRider(r, { ...drive, brake: true }, [], 1000, 1000);
  expect(r.speed).toBe(0);
});
it('thin curbs stop the bicycle without tunnelling; walking can cross', () => {
  const curb: Obstacle = { x: 140, y: 0, width: 2, height: 300, kind: 'curb' };
  const r = start();
  for (let i = 0; i < 200; i++) stepRider(r, drive, [curb], 1000, 1000);
  expect(r.x).toBeLessThanOrEqual(131);
  expect(r.speed).toBe(0);
  r.walking = true;
  for (let i = 0; i < 120; i++) stepRider(r, drive, [curb], 1000, 1000);
  expect(r.x).toBeGreaterThan(150);
  expect(r.speed).toBeLessThanOrEqual(32);
});
it('walls block both walking and riding; cannot mount on a curb', () => {
  const wall: Obstacle = { x: 140, y: 0, width: 20, height: 300, kind: 'wall' };
  const r = start();
  r.walking = true;
  for (let i = 0; i < 200; i++) stepRider(r, drive, [wall], 1000, 1000);
  expect(r.x).toBeLessThanOrEqual(131);
  expect(canRide({ ...r, x: 145 }, [{ ...wall, kind: 'curb' }])).toBe(false);
});
it('simple controls turn toward screen direction and repeat deterministically', () => {
  const a = start(),
    b = start();
  const input = { x: 0, y: 1, brake: false, scheme: 'simple' as const };
  for (let i = 0; i < 90; i++) {
    stepRider(a, input, [], 1000, 1000);
    stepRider(b, input, [], 1000, 1000);
  }
  expect(a).toEqual(b);
  expect(a.y).toBeGreaterThan(150);
  expect(a.heading).toBeCloseTo(Math.PI / 2);
});

it('can turn away after hitting a wall in classic mode', () => {
  const r = start();
  for (let i = 0; i < 60; i++)
    stepRider(r, { ...drive, x: 1, y: 0 }, [], 1000, 1000);
  expect(r.speed).toBe(0);
  expect(r.heading).toBeGreaterThan(0.5);
});
