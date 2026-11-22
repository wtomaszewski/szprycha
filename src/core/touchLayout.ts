import { z } from 'zod';

export const touchActions = [
  'left',
  'brake',
  'look',
  'right',
  'bell',
  'lights',
  'dismount',
] as const;

export type TouchAction = (typeof touchActions)[number];

const order = z
  .array(z.enum(touchActions))
  .length(touchActions.length)
  .refine((actions) => new Set(actions).size === touchActions.length);

export const touchLayoutSchema = order.optional().catch(undefined);

export const placActions: readonly TouchAction[] = [
  'left',
  'brake',
  'look',
  'right',
];
