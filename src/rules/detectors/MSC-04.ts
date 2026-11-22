import { verdict, type EnvState, type RiderState } from '../types';
import { frontLight } from './WYP-04';
import { rearLight } from './WYP-05';

export function lightsRequired(env: EnvState) {
  return (
    env.time !== 'day' ||
    env.visibilityLow ||
    env.weather === 'fog' ||
    env.weather === 'fog_dense' ||
    env.weather === 'rain_light' ||
    env.weather === 'rain_heavy'
  );
}

export class VisibilityDetector {
  private missing = false;
  private praised = false;
  private frontWasOff?: boolean;
  private rearWasOff?: boolean;

  evaluate(rider: RiderState, at: number, env: EnvState) {
    const lights = rider.lights;

    const frontWasOff = this.frontWasOff;
    const rearWasOff = this.rearWasOff;
    this.frontWasOff = lights && !lights.front;
    this.rearWasOff = lights && !lights.rear;
    if (!lights || rider.mode !== 'riding' || !lightsRequired(env)) {
      this.missing = false;
      return;
    }
    const { front, rear } = lights;
    if (front && rear) {
      this.missing = false;
      if (!this.praised && (frontWasOff || rearWasOff)) {
        this.praised = true;
        return frontWasOff && !rearWasOff
          ? frontLight(rider, at, true)
          : verdict('MSC-04', 'good', at, rider, { front, rear });
      }
    } else if (!this.missing && rider.speed > 0) {
      this.missing = true;
      if (!front && !rear)
        return verdict('MSC-04', 'minor', at, rider, { front, rear });
      return front ? rearLight(rider, at) : frontLight(rider, at, false);
    }
  }
}
