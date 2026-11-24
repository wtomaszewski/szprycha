import { expect, it } from 'vitest';
import { campaignCity } from '../../src/content/missions';
import { MissionProgress } from '../../src/gameplay/MissionProgress';
import { campaignCompleted } from '../../src/gameplay/exam/exam';
import { missionContent } from './run-mission-route';

it.each(campaignCity.options)(
  'follows the unlocked acts and training in %s',
  (city) => {
    const progress = new MissionProgress();
    const missions = missionContent.misje.filter(
      ({ miasto, poboczna }) => miasto === city && !poboczna,
    );
    // A later act appears first in the catalog but cannot jump ahead of training.
    const content = {
      ...missionContent,
      misje: [
        ...missions.filter(({ akt }) => akt > 0),
        ...missions.filter(({ akt }) => akt === 0),
      ],
    };

    let after = '';
    for (const mission of missions) {
      expect(progress.nextCampaignDestination(city, after, content)).toBe(
        mission,
      );
      progress.complete(mission, {
        points: 1000,
        stars: 3,
        balance: content.balans.gwiazdki,
      });
      after = mission.id;
    }
    expect(
      progress.nextCampaignDestination(city, after, content),
    ).toBeUndefined();
    expect(campaignCompleted(city, progress.store.profile, content)).toBe(true);
  },
);

it('only follows another city when its next mission links to the completed one', () => {
  const progress = new MissionProgress();
  const finished = missionContent.misje.find(({ id }) => id === 'WAW-T-01')!;
  const unrelated = missionContent.misje.find(({ id }) => id === 'WRO-T-01')!;
  const linked = {
    ...unrelated,
    wymagania: { misje_ukonczone: [finished.id] },
  };
  progress.complete(finished);
  expect(
    progress.nextCampaignDestination('warszawa', finished.id, {
      ...missionContent,
      misje: [finished, unrelated],
    }),
  ).toBeUndefined();
  expect(
    progress.nextCampaignDestination('warszawa', finished.id, {
      ...missionContent,
      misje: [finished, linked],
    }),
  ).toBe(linked);
});
