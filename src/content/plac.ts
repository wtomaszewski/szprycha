import { z } from 'zod';

const positive = z.number().positive();
const ratio = z.number().min(0).max(1);
const point = z.strictObject({ x: z.number(), y: z.number() });
const cone = point.extend({ radius: positive });
const area = point.extend({ width: positive, height: positive });
const base = {
  start: point.extend({ heading: z.number() }),
  hint: z.string().min(1),
};
const straight = { ...base, finishX: positive };
const track = { ...straight, halfWidth: positive };

export const placExercisesSchema = z.strictObject({
  'PLAC-01': z.strictObject({
    ...base,
    path: z.array(point).min(4).max(80),
    halfWidth: positive,
    gateRadius: positive,
    cones: z.array(cone).min(2).max(30),
  }),
  'PLAC-02': z.strictObject({
    ...straight,
    gates: z
      .array(cone.extend({ side: z.enum(['above', 'below']) }))
      .min(2)
      .max(30)
      .refine((gates) =>
        gates.every(
          (gate, i) =>
            i === 0 ||
            (gate.x > gates[i - 1]!.x && gate.side !== gates[i - 1]!.side),
        ),
      ),
  }),
  'PLAC-03': z.strictObject(track),
  'PLAC-04': z
    .strictObject({ ...base, stopBox: area, stopTolerance: positive })
    .refine(({ stopBox, start }) => stopBox.x > start.x),
  'PLAC-05': z.strictObject(straight),
  'PLAC-06': z
    .strictObject({
      ...track,
      signalFromX: positive,
      signal: z.enum(['left', 'right']),
    })
    .refine(
      ({ start, finishX, signalFromX }) =>
        start.x < signalFromX && signalFromX < finishX,
    ),
});

export const placSchema = z
  .strictObject({
    width: z.number().int().min(480).max(1800),
    height: z.number().int().min(280).max(1000),
    exercises: placExercisesSchema,
  })
  .superRefine(({ width, height, exercises }, ctx) => {
    const inside = ({ x, y }: z.infer<typeof point>, margin = 0) =>
      x > margin && x < width - margin && y > margin && y < height - margin;
    for (const [id, exercise] of Object.entries(exercises)) {
      const { start } = exercise;
      let valid = inside(start, 10);
      if ('finishX' in exercise)
        valid &&= exercise.finishX > start.x && exercise.finishX < width - 10;
      if ('path' in exercise) {
        valid &&= exercise.path.every((p) => inside(p, exercise.halfWidth));
        valid &&=
          exercise.path[0]!.x === start.x && exercise.path[0]!.y === start.y;
        valid &&=
          exercise.halfWidth > 9 && exercise.gateRadius < exercise.halfWidth;
        valid &&= exercise.cones.every((p) => inside(p, p.radius));
      }
      if ('gates' in exercise)
        valid &&= exercise.gates.every(
          (p) => inside(p, p.radius) && p.x > start.x && p.x < exercise.finishX,
        );
      if ('stopBox' in exercise) {
        const box = exercise.stopBox;
        valid &&=
          inside(box) &&
          inside({
            x: box.x + box.width + exercise.stopTolerance,
            y: box.y + box.height,
          });
        valid &&= box.width >= 18 && box.height >= 18;
        valid &&= start.y >= box.y + 9 && start.y <= box.y + box.height - 9;
      }
      if ('halfWidth' in exercise && 'finishX' in exercise)
        valid &&=
          exercise.halfWidth > 9 &&
          start.y - exercise.halfWidth > 0 &&
          start.y + exercise.halfWidth < height;
      if (!valid)
        ctx.addIssue({
          code: 'custom',
          path: ['exercises', id],
          message: 'Exercise geometry must fit the yard and follow the start',
        });
    }
  });

export const placBalanceSchema = z.strictObject({
  points: z
    .strictObject({ good: positive, minor: ratio, major: ratio })
    .refine(({ good, minor, major }) => good > minor && minor > major),
  medals_s: z
    .strictObject({ gold: positive, silver: positive, bronze: positive })
    .refine(({ gold, silver, bronze }) => gold < silver && silver < bronze),
  time_limit_s: positive.max(120),
  feedback_s: positive.max(10),
  ranking_limit: z.number().int().min(1).max(20),
  physics: z
    .strictObject({
      max_speed: positive.max(150),
      balance_speed: positive,
      wobble_degrees: positive.max(45),
      wobble_hz: positive,
      one_hand_degrees: positive.max(45),
      brake_rise_per_s: positive,
      lock_pressure: ratio,
      lock_speed: positive,
      skid_brake_force: positive.max(250),
      foot_delay_s: positive,
    })
    .refine(
      ({ balance_speed, lock_speed, max_speed }) =>
        balance_speed < max_speed && lock_speed < max_speed,
    ),
});

export type PlacCourse = z.infer<typeof placSchema>;
export type PlacExercises = PlacCourse['exercises'];
export type PlacId = keyof PlacExercises;
export type PlacBalance = z.infer<typeof placBalanceSchema>;
