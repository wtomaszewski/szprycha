# 07 — Silnik zasad (Rule Engine)

To najważniejszy i najbardziej krytyczny moduł. Musi być **czystym TypeScriptem** (bez Phasera), deterministyczny i w 100% pokryty testami scenariuszowymi.

## 1. Przepływ danych
```
Tiled (.tmj) ──► WorldModel (statyczny: strefy, pasy, skrzyżowania, znaki, sygnalizatory)
                         │
Gra (Phaser) ──► AgentState[] co tick (gracz + AI: pozycja, kurs, prędkość, stan)
                         │
                 ZoneTracker ──► zdarzenia: enterZone/exitZone/approach/enterConflict/exitIntersection
                         │
                 IntersectionManager ──► kto ma pierwszeństwo, konflikty, time-to-conflict
                         │
                 Detectors (1 na ruleId) ──► Verdict[]
                         │
                 EventBus ──► ScoreSystem, MasterySystem, FeedbackUI, MissionSystem, Achievements, Replay
```

## 2. Model gracza (`RiderState`)
```ts
interface RiderState {
  id: string;
  pos: Vec2; heading: number; speed: number;   // m/s, kafel = 1.5 m
  mode: 'riding' | 'walking_bike';              // zsiadanie: klawisz X
  signal: 'none' | 'left' | 'right';            // ręka; auto-wyłączenie po manewrze lub 6 s
  shoulderCheck: { lastLeftAt: number; lastRightAt: number }; // „obejrzyj się”
  handsOnBar: 0 | 1 | 2;                        // 1 przy sygnalizowaniu, 0 = błąd MAN-09
  feetOnPedals: boolean;
  helmet: { worn: boolean; fastened: boolean };
  lights: { front: boolean; rear: boolean };
  equipment: { brake: boolean; bell: boolean; rearReflector: boolean; frontLamp: boolean; rearLamp: boolean };
  passenger: boolean;                           // zdarzenie „podwózka na bagażniku”
  phoneInHand: boolean;
  age: number;                                  // wiek z profilu (domyślnie 10); wpływa na KASK-01, GDZIE-10
  supervising?: string;                         // id dziecka <10 lat pod opieką (misje z Frankiem)
}
```

## 3. Kontekst środowiskowy
`EnvState { time: 'day'|'dusk'|'night', weather: 'clear'|'rain_heavy'|'snow'|'wind_strong'|'fog'|'ice', visibilityLow: boolean }` — wpływa na WYP-04/05, MSC-04, GDZIE-04.

## 4. Detektor — kontrakt
```ts
interface Detector {
  ruleId: string;                     // z content/przepisy.yaml
  subscribes: WorldEventType[];       // np. ['enterZone','tick','approachIntersection']
  evaluate(ev: WorldEvent, ctx: RuleContext): Verdict | null;
}
interface Verdict {
  ruleId: string;
  kind: 'good' | 'minor' | 'major';
  at: number;                         // czas symulacji
  pos: Vec2;
  evidence: Record<string, unknown>;  // np. { conflictWith: 'car_12', ttc: 1.3 }
  feedbackKey: string;                // i18n: linia Sierżant Oli
  highlight?: { signId?: string; zoneId?: string; agentId?: string }; // do stop-klatki
}
```
Ważność (`kind`) domyślnie z `przepisy.yaml` (`waga_bledu`), detektor może eskalować do `major`, gdy powstał konflikt (TTC < próg).

## 5. Kluczowe algorytmy

**Pierwszeństwo na skrzyżowaniu (IntersectionManager):**
1. Każdy wlot skrzyżowania ma `priorityClass` z danych Tiled: `main` (D-1/droga z pierwszeństwem), `minor` (A-7/B-20), `equal`, `signal` (sterowane fazą), `roundabout_in`, `roundabout_ring`.
2. Dla pary agentów A (gracz) i B: wyznacz zamierzony manewr (z kursu + sygnalizacji + trasy misji/AI: prosto/lewo/prawo/zawracanie) i punkt konfliktu z macierzy konfliktów skrzyżowania (prekomputowana z geometrii pasów).
3. Reguły rozstrzygania (w tej kolejności): polecenie policjanta (strefa kierowania ruchem) → sygnalizacja (faza + zielona strzałka = warunkowe) → znaki (main > minor) → tramwaj na skrzyżowaniu równorzędnym → prawa ręka → skręcający w lewo ustępuje jadącym z naprzeciwka prosto i w prawo → skręcający ustępuje pieszym/rowerzystom na przejściu na drodze, w którą wjeżdża.
4. Naruszenie pierwszeństwa = gracz wjeżdża w obszar konfliktu, gdy agent z pierwszeństwem ma `TTC < 2,0 s` (strojone w `balans.yaml`). `TTC < 1,0 s` lub hamowanie awaryjne AI → `major`.
5. Poprawne ustąpienie (gracz zwolnił/zatrzymał się przed obszarem konfliktu i przepuścił) → `good`.

**Sygnalizowanie zmiany kierunku (MAN-01):**
- Manewr = zmiana kursu > 45° na skrzyżowaniu, zjazd z drogi, zmiana pasa, omijanie z przesunięciem bocznym > 1 m.
- `good`: `signal` zgodny z kierunkiem aktywny ≥ 1,5 s przed wjazdem w obszar manewru (dozwolone opuszczenie ręki w trakcie samego skrętu).
- `minor`: brak lub zły kierunek.

**Obejrzenie się (MAN-03/MAN-07):** przed skrętem w lewo, ruszeniem, omijaniem: `shoulderCheck.lastLeftAt` w oknie 3 s przed manewrem → `good` (bonus). Brak = nie błąd, ale jeśli z tyłu był pojazd w martwym polu → `minor` + pokazanie go w stop-klatce. Mechanika: przycisk „Obejrzyj się” na moment odsłania strefę za graczem (efekt zawężonego widzenia).

**Gdzie jechać (GDZIE-*):**
- ZoneTracker zna strefę pod kołami. Reguła GDZIE-01: jeśli gracz jedzie `roadway` równolegle do istniejącego `bike_path` lub `bike_lane` przypisanego do tego kierunku (atrybut `parallelBikeInfra` pasa w Tiled) przez > 3 s → `minor`.
- GDZIE-04 (chodnik): `sidewalk` + `mode='riding'` → sprawdź wyjątki: `supervising` dziecka <10 lat; `weather` ∈ {rain_heavy, snow, wind_strong, fog, ice}; atrybuty chodnika `width_m ≥ 2` i sąsiednia jezdnia `speedLimit > 50` i brak DDR/pasa. Brak wyjątku → `minor`. Z wyjątkiem → sprawdzaj GDZIE-05 (prędkość ≤ 2,5 m/s przy pieszych w promieniu 3 m, ustępowanie pieszym).
- GDZIE-06: wjazd na `crossing.pedestrian` w trybie `riding` → `minor`; jeśli pieszy na przejściu w promieniu 4 m → `major`. Przejście w trybie `walking_bike` → `good`.

**Sygnalizacja świetlna (SYG-01):** przekroczenie linii zatrzymania (P-12 / linia z danych) przy czerwonym → `major`; przy żółtym, gdy gracz miał dość miejsca na bezpieczne zatrzymanie (droga hamowania < odległość do linii) → `minor`. Zatrzymanie przed linią na czerwonym → `good`.

**STOP (ZNAK-STOP):** wymagane `speed < 0,1 m/s` przez ≥ 0,3 s w strefie 0–3 m przed linią zatrzymania. Brak → `minor` (nawet bez konfliktu); z konfliktem → `major`.

**Przejazd kolejowy (MSC-01):** wjazd na `crossing.rail` gdy zapory w ruchu/opuszczone lub sygnał czerwony migający → `major`. Wyprzedzanie w strefie 100 m przed przejazdem (dane: `noOvertakeZone`) → `minor`.

## 6. Dobre nawyki (werdykty `good`) — lista obowiązkowa
Zasygnalizowany manewr · ustąpione pierwszeństwo · zatrzymanie na STOP · zatrzymanie na czerwonym · przeprowadzenie roweru przez przejście · obejrzenie się przed manewrem · włączenie świateł o zmroku (raz na misję) · zachowanie odstępu od zaparkowanych aut (> 1 m) · zjazd na prawo przed pojazdem uprzywilejowanym · przepuszczenie pieszych na przystanku bez wysepki · wybór DDR zamiast jezdni · zwolnienie na chodniku przy pieszych · odebranie telefonu dopiero po zatrzymaniu.

## 7. Stop-klatka i feedback
Przy `major` (oraz pierwszym wystąpieniu `minor` danej reguły w sesji):
1. Zwolnienie czasu (0,3 s), zamrożenie, zoom ×1,5 na miejsce.
2. Podświetlenie: znak/strefa/agent z `highlight`, strzałka „tu był pieszy / auto miało pierwszeństwo”.
3. Dymek Sierżant Oli (`feedbackKey`, ≤140 znaków) + opcjonalnie lektor.
4. Przyciski: **Powtórka** (replay ostatnich 5 s z bufora — zapisuj stany wszystkich agentów co tick), **Jeszcze raz** (checkpoint), **Rozumiem** (kontynuuj — tylko przy `minor`).
5. Wpis do „Notatnika Kuriera” (lista przepisów, które się pojawiły, z wyjaśnieniem i znakiem).

## 8. Testy scenariuszowe (`tests/rules/*.yaml`)
```yaml
name: prawa ręka — auto z prawej, gracz nie ustępuje
map: fixtures/equal_x.tmj
env: { time: day, weather: clear }
agents:
  - { id: car1, type: car, path: [E_in, W_out], speed: 8, spawnAt: 0 }
player:
  start: S_in
  inputs:                        # sekwencja wejść w czasie
    - { t: 0,   throttle: 1 }
    - { t: 2.0, steer: 0 }       # prosto przez skrzyżowanie
expect:
  - { ruleId: PIER-01, kind: major }
expectNot:
  - { ruleId: MAN-01 }
```
Minimum: dla każdej reguły z detektorem — 1 przypadek `good`, 1 `minor` (jeśli możliwy), 1 `major` (jeśli możliwy), 1 przypadek graniczny (np. wyjątek GDZIE-04). Testy uruchamiane w CI, symulacja headless z krokiem stałym 1/60 s.

## 9. Debug overlay (F3)
Strefy (kolory), pasy (strzałki), klasy pierwszeństwa wlotów, aktualna faza świateł, TTC do najbliższych konfliktów, ostatnie 10 werdyktów, mastery reguł gracza.

## 10. Reguły `quiz-only`
Niektóre przepisy trudno sprawdzić w symulacji (np. dokładna treść rozmowy z dyspozytorem 112, kolumna > 15 rowerów poza misją). W `przepisy.yaml` mają `detektor: quiz-only` albo `detektor: scenka` (interaktywna scenka z wyborami, np. pierwsza pomoc). Nie udawaj wykrywania, którego nie ma.
