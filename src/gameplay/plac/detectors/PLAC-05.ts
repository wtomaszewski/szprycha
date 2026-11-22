import type { PlacExercises } from '../../../content/plac';
import { detector, type ReportFault } from './types';

export function signalledStart(
  exercise: PlacExercises['PLAC-05'],
  report: ReportFault,
) {
  let looked = false;
  let signalled = false;
  let previousSignal = false;
  let started = false;
  return detector((state, { rider, actions }) => {
    const signalling = actions.signal === 'left';
    if (!started && rider.speed > 0) {
      started = true;
      if (!looked) report('noLook', 'major');
      if (!signalling) report('noStartSignal', 'major');
      else if (!signalled) report('signalOrder', 'major');
    }
    if (!started) {
      if (signalling && !previousSignal && looked) signalled = true;
      if (!signalling) signalled = false;
      if (actions.looking) looked = true;
      previousSignal = signalling;
    }
    state.nextMarker = started ? 3 : signalled ? 2 : looked ? 1 : 0;
    return rider.x >= exercise.finishX;
  });
}
