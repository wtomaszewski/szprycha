import type { PlacBalance, PlacCourse } from '../../content/plac.ts';

export const placCourseKey = (course: PlacCourse, balance: PlacBalance) =>
  JSON.stringify(
    [
      1, // Bump when fixed-step physics or judging changes.
      course,
      balance.physics,
      balance.time_limit_s,
    ],
    (key, value: unknown) => (key === 'hint' ? undefined : value),
  );
