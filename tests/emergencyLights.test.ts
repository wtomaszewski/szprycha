import { expect, it } from 'vitest';
import { emergencyLightPhase } from '../src/render/emergencyLights';

it('alternates the emergency lights at most four times per second (2 Hz)', () => {
  let previous = emergencyLightPhase(0);
  let changes = 0;
  for (let ms = 1; ms <= 1000; ms++) {
    const phase = emergencyLightPhase(ms / 1000);
    if (phase !== previous) changes++;
    previous = phase;
  }

  expect(changes).toBeGreaterThan(0);
  expect(changes).toBeLessThanOrEqual(4);
});
