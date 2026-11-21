import { expect, it } from 'vitest';
import { pragaRoutes, type Waypoint } from '../missions/praga-routes';
import { missionContent, runPragaRoute } from '../missions/run-praga-route';

const shortcuts = missionContent.misje.filter(({ skrot }) => skrot);
const { bonus_czasu_max, kara_minor } = missionContent.balans.misja;

it('keeps a shortcut in only one or two of the four M4d part 1 missions', () => {
  const count = shortcuts.filter(({ id }) =>
    Object.hasOwn(pragaRoutes, id),
  ).length;
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(2);
});

it.each(shortcuts)(
  '$id: even the maximum shortcut time bonus loses to the legal route',
  (definition) => {
    const { id, par_s, limit_s } = definition;
    if (!Object.hasOwn(pragaRoutes, id))
      throw new Error(`Missing route for ${id}`);
    const missionId = id as keyof typeof pragaRoutes;
    const routes: { legal: Waypoint[]; shortcut?: Waypoint[] } =
      pragaRoutes[missionId];
    if (!routes.shortcut || !limit_s || limit_s <= par_s)
      throw new Error(`Missing shortcut or valid time limit for ${id}`);

    const legal = runPragaRoute(missionId, routes.legal);
    const shortcut = runPragaRoute(missionId, routes.shortcut);
    expect(legal.collision).toBe(false);
    expect(shortcut.collision).toBe(false);
    expect(legal.mission.result).toMatchObject({
      status: 'completed',
      timeBonusEligible: true,
      illegalShortcut: false,
    });
    expect(
      legal.mission.result!.verdicts.every(({ kind }) => kind === 'good'),
    ).toBe(true);
    const result = shortcut.mission.result;
    expect(
      result,
      JSON.stringify({ ...shortcut, mission: undefined }),
    ).toMatchObject({
      status: 'completed',
      timeBonusEligible: true,
      illegalShortcut: true,
      verdicts: expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'ZNAK-B1',
          kind: 'minor',
          highlight: expect.objectContaining({
            signId: `${definition.skrot!.odcinek}-B-1`,
          }),
        }),
      ]),
    });
    expect(result!.elapsedSeconds).toBeLessThan(
      legal.mission.result!.elapsedSeconds,
    );
    const legalBonus =
      bonus_czasu_max *
      Math.max(
        0,
        Math.min(
          1,
          (limit_s - legal.mission.result!.elapsedSeconds) / (limit_s - par_s),
        ),
      );
    // Use the full time bonus and only the unavoidable B-1 penalty.
    expect(bonus_czasu_max - kara_minor).toBeLessThan(legalBonus);
  },
);
