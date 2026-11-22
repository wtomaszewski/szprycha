import { z } from 'zod';
import { rankingIdentity } from './rankings.ts';
import { moduleId } from './schemas.ts';

export const classCodeAlphabet = '23456789ACDEFHJKMNPQRTVWXY';
export const classCodeLength = 10;
export const classCode = z
  .string()
  .regex(new RegExp(`^[${classCodeAlphabet}]{${classCodeLength}}$`));
export const classId = z.uuidv4();
export const teacherToken = z.string().regex(/^[a-f0-9]{64}$/);
export const teacherCredentials = z.strictObject({
  email: z
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),
  password: z.string().min(12).max(128),
});
export const teacherRegistration = teacherCredentials.extend({
  adult: z.literal(true),
});
export const newClass = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1)
    .max(48)
    .regex(/^\P{Cc}+$/u),
});
export const classInfo = newClass.extend({
  id: classId,
  code: classCode.nullable(),
});
export const classXp = z.number().min(0).max(1_000_000).multipleOf(0.5);
export const classMastery = z.record(
  moduleId,
  z.number().int().min(0).max(100),
);
export const classTotals = z.strictObject({
  xp: classXp,
  mastery: classMastery,
});
export const classProgress = classTotals.extend({
  nickname: rankingIdentity.shape.nickname,
});
export const classJoin = classProgress.extend({ code: classCode });
export const classUpdate = classProgress.extend({ memberId: classId });
export const membership = z.strictObject({ memberId: classId });
export const classPlacement = classProgress.extend({
  position: z.number().int().positive(),
});
export const studentBoard = z.strictObject({
  top: z.array(classPlacement).max(50),
  self: classPlacement,
});
export const teacherBoard = classInfo.extend({
  rows: z.array(classPlacement.extend({ memberId: classId })),
});

export type ClassInfo = z.infer<typeof classInfo>;
export type ClassTotals = z.infer<typeof classTotals>;
export type ClassProgress = z.infer<typeof classProgress>;
