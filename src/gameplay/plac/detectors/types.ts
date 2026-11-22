import type { Rider, RiderState } from '../../bicycle';

export type Fault =
  | 'footDown'
  | 'line'
  | 'cone'
  | 'missedCone'
  | 'offTrack'
  | 'shortStop'
  | 'longStop'
  | 'skid'
  | 'noLook'
  | 'noStartSignal'
  | 'signalOrder'
  | 'noHandSignal'
  | 'timeout';

export type Grade = 'good' | 'minor' | 'major';
export type ReportFault = (fault: Fault, grade: Exclude<Grade, 'good'>) => void;
export type Point = Pick<Rider, 'x' | 'y'>;

export interface PlacSample {
  rider: Rider;
  previous: Point;
  actions: RiderState;
  footDown: boolean;
  skidding: boolean;
}

export interface PlacDetector {
  nextMarker: number;
  readonly coneHits: Set<number>;
  /** Advances by one fixed tick, returning true when the element ends. */
  step(sample: PlacSample): boolean;
}

export function detector(
  step: (state: PlacDetector, sample: PlacSample) => boolean,
): PlacDetector {
  return {
    nextMarker: 0,
    coneHits: new Set(),
    step(sample) {
      return step(this, sample);
    },
  };
}
