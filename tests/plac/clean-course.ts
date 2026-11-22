import type { PlacCourse, PlacBalance } from '../../src/content/plac';
import type { DriveInput, RiderState } from '../../src/gameplay/bicycle';
import type { PlacRun } from '../../src/gameplay/plac/PlacRun';

const drive = { x: 0, y: -1, brake: false, scheme: 'classic' } as const;
const coast = { ...drive, y: 0 };
const brake = { ...coast, brake: true };

export function cleanPlacInput(
  run: PlacRun,
  state: RiderState,
  course: PlacCourse,
  balance: PlacBalance,
): DriveInput {
  const { x, y, heading } = run.ride.rider;
  const steerTo = (angle: number) => {
    const error = angle - heading;
    return Math.max(
      -1,
      Math.min(1, Math.atan2(Math.sin(error), Math.cos(error)) * 10),
    );
  };
  switch (run.id) {
    case 'PLAC-01': {
      const point = course.exercises['PLAC-01'].path[run.detector.nextMarker]!;
      return {
        ...drive,
        y: -0.62,
        x: steerTo(Math.atan2(point.y - y, point.x - x)),
      };
    }
    case 'PLAC-02': {
      const { gates, start, finishX } = course.exercises['PLAC-02'];
      const targetX = x + 10;
      const targetY =
        targetX < gates[0]!.x - 34 || targetX > finishX - 42
          ? start.y
          : start.y -
            26 *
              Math.cos(
                ((targetX - gates[0]!.x) * Math.PI) /
                  (gates[1]!.x - gates[0]!.x),
              );
      return {
        ...drive,
        y: -0.55,
        x: steerTo(Math.atan2(targetY - y, targetX - x)),
      };
    }
    case 'PLAC-04':
      return x < 431 ? { ...drive, y: -0.7 } : brake;
    case 'PLAC-05':
      state.looking = run.ride.ticks === 0;
      state.signal =
        run.ride.ticks === 1 || run.ride.ticks === 2 ? 'left' : null;
      return run.ride.ticks < 2 ? coast : drive;
    case 'PLAC-06': {
      const { start, signal, signalFromX } = course.exercises['PLAC-06'];
      state.signal = x >= signalFromX - 8 ? signal : null;
      const compensatingHeading = state.signal
        ? (balance.physics.one_hand_degrees * Math.PI) / 180
        : 0;
      return {
        ...drive,
        x: steerTo(compensatingHeading + (start.y - y) / 18),
      };
    }
    default:
      return drive;
  }
}
