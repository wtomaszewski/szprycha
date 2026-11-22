import type { PlacExercises } from '../../../content/plac';
import { assessLane } from './geometry';
import { detector, type ReportFault } from './types';

export function narrowTrack(
  exercise: PlacExercises['PLAC-03'],
  report: ReportFault,
) {
  return detector((_state, { rider }) => {
    assessLane(
      Math.abs(rider.y - exercise.start.y),
      exercise.halfWidth,
      report,
    );
    return rider.x >= exercise.finishX;
  });
}
