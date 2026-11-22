import type { PlacBalance, PlacCourse, PlacId } from '../../content/plac';
import { FIXED_STEP, type DriveInput, type RiderState } from '../bicycle';
import { PlacRide } from './PlacRide';
import { figureEight } from './detectors/PLAC-01';
import { slalom } from './detectors/PLAC-02';
import { narrowTrack } from './detectors/PLAC-03';
import { brakingBox } from './detectors/PLAC-04';
import { signalledStart } from './detectors/PLAC-05';
import { oneHand } from './detectors/PLAC-06';
import type {
  Fault,
  Grade,
  PlacDetector,
  ReportFault,
} from './detectors/types';

const detectors = {
  'PLAC-01': figureEight,
  'PLAC-02': slalom,
  'PLAC-03': narrowTrack,
  'PLAC-04': brakingBox,
  'PLAC-05': signalledStart,
  'PLAC-06': oneHand,
};
export const placIds = Object.keys(detectors) as PlacId[];
export const ghostInterval = 4;
export type GhostPose = [x: number, y: number, heading: number];
export type GhostTrack = { ticks: number; poses: GhostPose[] };
export type Ghost = GhostTrack[];
export type Medal = keyof PlacBalance['medals_s'];

export interface PlacResult {
  id: PlacId;
  grade: Grade;
  faults: ReadonlyMap<Fault, Exclude<Grade, 'good'>>;
  ticks: number;
}

export function scorePlac(
  results: readonly PlacResult[],
  balance: PlacBalance,
  passThreshold: number,
) {
  const points = results.reduce(
    (sum, { grade }) => sum + balance.points[grade],
    0,
  );
  const max = results.length * balance.points.good;
  const ticks = results.reduce((sum, result) => sum + result.ticks, 0);
  const clean =
    results.length === placIds.length &&
    results.every(({ grade }) => grade === 'good');
  const medal = clean
    ? (['gold', 'silver', 'bronze'] as const).find(
        (level) =>
          ticks <= Math.floor(balance.medals_s[level] / FIXED_STEP + 1e-9),
      )
    : undefined;
  return {
    points,
    max,
    passed: max > 0 && points / max >= passThreshold,
    ticks,
    clean,
    medal,
  };
}

export class PlacRun {
  readonly results: PlacResult[] = [];
  readonly ghost: Ghost = [];
  ride!: PlacRide;
  detector!: PlacDetector;
  index = 0;
  private readonly limitTicks: number;
  private faults = new Map<Fault, Exclude<Grade, 'good'>>();
  private grade: Grade = 'good';
  private poses: GhostPose[] = [];
  private readonly report: ReportFault = (fault, grade) => {
    if (this.faults.get(fault) !== 'major') this.faults.set(fault, grade);
    if (this.grade !== 'major') this.grade = grade;
  };

  constructor(
    private readonly course: PlacCourse,
    readonly balance: PlacBalance,
    private readonly actions: RiderState,
    readonly ids: readonly PlacId[],
    private readonly recordGhost: boolean,
  ) {
    this.limitTicks = Math.ceil(balance.time_limit_s / FIXED_STEP);
    this.prepare();
  }

  get id() {
    return this.ids[this.index]!;
  }

  get result() {
    return this.results[this.index];
  }

  private prepare() {
    this.ride = new PlacRide(
      this.course,
      this.course.exercises[this.id].start,
      this.balance.physics,
      this.actions,
    );
    // The explicit cases keep the rule ID paired with its geometry type.
    const { exercises } = this.course;
    switch (this.id) {
      case 'PLAC-01':
        this.detector = detectors[this.id](exercises[this.id], this.report);
        break;
      case 'PLAC-02':
        this.detector = detectors[this.id](exercises[this.id], this.report);
        break;
      case 'PLAC-03':
        this.detector = detectors[this.id](exercises[this.id], this.report);
        break;
      case 'PLAC-04':
        this.detector = detectors[this.id](exercises[this.id], this.report);
        break;
      case 'PLAC-05':
        this.detector = detectors[this.id](exercises[this.id], this.report);
        break;
      case 'PLAC-06':
        this.detector = detectors[this.id](exercises[this.id], this.report);
        break;
    }
    this.faults = new Map();
    this.grade = 'good';
    this.poses = [];
    this.record();
  }

  private record() {
    if (!this.recordGhost) return;
    const { x, y, heading } = this.ride.rider;
    this.poses.push([
      Math.round(x * 16) / 16,
      Math.round(y * 16) / 16,
      heading,
    ]);
  }

  step(input: DriveInput) {
    if (this.result) return this.result;
    const sample = this.ride.step(input);
    const { ticks } = this.ride;
    if (ticks % ghostInterval === 0) this.record();
    if (!this.detector.step(sample)) {
      if (ticks < this.limitTicks) return;
      this.report('timeout', 'major');
    }
    const result = {
      id: this.id,
      grade: this.grade,
      faults: this.faults,
      ticks,
    };
    this.results.push(result);
    if (this.recordGhost) this.ghost.push({ ticks, poses: this.poses });
    return result;
  }

  advance() {
    if (!this.result || this.index + 1 === this.ids.length) return false;
    this.index++;
    this.prepare();
    return true;
  }
}
