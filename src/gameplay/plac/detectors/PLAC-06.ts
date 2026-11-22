import type { PlacExercises } from '../../../content/plac';
import { assessLane } from './geometry';
import { detector, type ReportFault } from './types';

export function oneHand(
  exercise: PlacExercises['PLAC-06'],
  report: ReportFault,
) {
  const { start, halfWidth, signal, signalFromX, finishX } = exercise;
  return detector((_state, { rider, actions }) => {
    if (rider.x >= signalFromX) {
      if (actions.signal !== signal) report('noHandSignal', 'major');
      assessLane(Math.abs(rider.y - start.y), halfWidth, report);
    }
    return rider.x >= finishX;
  });
}
