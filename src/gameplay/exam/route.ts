import type { MissionCity, MissionDefinition } from '../../content/missions.ts';
import type { GameContent } from '../../content/schemas.ts';

type ExamBalance = GameContent['balans']['licencja'];

export function examRoute(
  city: MissionCity,
  balance: ExamBalance,
): MissionDefinition {
  const { start, punkty } = balance.przejazdy[city];
  return {
    id: city === 'warszawa' ? 'WAW-EGZAMIN' : 'WRO-EGZAMIN',
    miasto: city,
    akt: 0,
    tytul: 'exam.ride',
    zleceniodawca: 'sierzant_ola',
    typ: 'egzamin',
    start: { poi: start },
    cele: punkty.map((poi) => ({
      typ: 'dojedz',
      poi,
      opis: 'exam.rideWaypoint',
    })),
    checkpointy: punkty.slice(0, -1),
    zdarzenia_wymuszone: [],
    warunki_porazki: [],
    reguly_cwiczone: [],
    par_s: 120,
    min_dobre_nawyki: 0,
    nagrody: { xp: 0, zetony: 0 },
    ruch_ai: false,
  };
}
