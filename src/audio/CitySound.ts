import type { DriveInput, Rider } from '../gameplay/bicycle';
import type { EnvState, Vec2 } from '../rules/types';
import { contains, type WorldModel } from '../rules/world/WorldModel';
import { audio } from './GameAudio';

export class CitySound {
  private readonly rough;
  private readonly crossings;
  private bellHeld = false;
  private braking = false;
  private nextScan = 0;
  private cobblesAt = 0;
  private tramAt = 0;
  private railAt = 0;
  private crossingAt = 0;
  private peacockNearby = false;
  private pigeonAt = 0;

  constructor(
    private readonly world: WorldModel,
    private readonly peacocks: readonly Vec2[],
  ) {
    this.rough = world.zones.filter(({ surface }) => surface === 'rough');
    this.crossings = world.crossings.filter(
      ({ kind, rail, signal }) =>
        (kind === 'rail' && rail) ||
        ((kind === 'pedestrian' || kind === 'combined') && signal),
    );
  }

  reset() {
    this.bellHeld = this.braking = this.peacockNearby = false;
    this.nextScan =
      this.cobblesAt =
      this.tramAt =
      this.railAt =
      this.crossingAt =
      this.pigeonAt =
        0;
    audio.updateSiren(0);
  }

  input(rider: Rider, input: DriveInput, bell: boolean) {
    if (bell && !this.bellHeld) audio.ringBell();
    this.bellHeld = bell;
    const braking =
      input.brake || (input.scheme === 'classic' && input.y > 0.1);
    if (braking && !this.braking && !rider.walking && rider.speed > 22)
      audio.play('brake');
    this.braking = braking;
  }

  scan(at: number, rider: Rider, position: Vec2, env: EnvState, tram: boolean) {
    if (!audio.effectsAudible || at < this.nextScan) return;
    this.nextScan = at + 0.1;

    if (tram && at >= this.tramAt) {
      audio.play('tram', 0.7);
      this.tramAt = at + 4;
    }
    if (
      at >= this.cobblesAt &&
      !rider.walking &&
      rider.speed > 28 &&
      this.rough.some((zone) => contains(zone, position))
    ) {
      audio.play('cobbles', Math.min(1, rider.speed / 105));
      this.cobblesAt = at + 0.21;
    }
    for (const crossing of this.crossings) {
      if (crossing.kind === 'rail') {
        if (
          at >= this.railAt &&
          contains(crossing, position, 8) &&
          this.world.railState(crossing, at, env)?.flashing
        ) {
          audio.play('rail');
          this.railAt = at + 1.02;
        }
      } else if (
        at >= this.crossingAt &&
        contains(crossing, position, 3) &&
        this.world.crossingPhase(crossing, at, env) === 'green'
      ) {
        audio.play('crossing', 0.7);
        this.crossingAt = at + 0.82;
      }
    }
    const nearPeacock = this.peacocks.some(
      ({ x, y }) => (x - rider.x) ** 2 + (y - rider.y) ** 2 < 96 ** 2,
    );
    if (nearPeacock && !this.peacockNearby) audio.play('peacock', 0.75);
    this.peacockNearby = nearPeacock;
  }

  pigeon(at: number) {
    if (at < this.pigeonAt) return;
    audio.play('pigeon', 0.65);
    this.pigeonAt = at + 1.25;
  }
}
