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
  ageBand: 'under10' | '10to15' | '16plus';     // lokalny przedział, domyślnie 10–15
  supervisedChildId?: string;                  // jawna rola dorosłego opiekuna w scenariuszu
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
- GDZIE-04 (chodnik): `sidewalk` + `mode='riding'` → sprawdź wyjątki: jawna opieka dorosłego nad jadącym dzieckiem <10 lat; `weather` ∈ {rain_heavy, snow, wind_strong, fog, ice}; atrybuty chodnika `width_m ≥ 2` i sąsiednia jezdnia `speedLimit > 50` i brak DDR/pasa. Brak wyjątku → `minor`. Z wyjątkiem → sprawdzaj GDZIE-05 (prędkość ≤ 2,5 m/s przy pieszych w promieniu 3 m, ustępowanie pieszym).
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
map: maps/miasteczko.tmj
scenarios:
  - name: prawa ręka — gracz nie ustępuje autu z prawej
    player: { x: 528, y: 723, heading: -90, speed: 4 }
    agents:
      - { id: car, kind: car, x: 590, y: 560, heading: 180, speed: 4, laneId: equal-E }
    inputs: [{ t: 0.5, y: 695 }]
    expect: { PIER-01: [major], MAN-01: [] }
```

W M2 scenariusz podaje próbki wejściowe silnika. Pozycje w YAML odnoszą się do pikseli Tiled, prędkości są w m/s, a kurs podajemy w stopniach zgodnie z osiami ekranu. Runner interpoluje pozycje z krokiem 1/60 s, a pozostałe pola utrzymuje do następnej próbki. Tablica przy identyfikatorze określa wszystkie oczekiwane wagi w kolejności emisji. Pusta tablica wymaga braku werdyktu tej reguły. Osobny test powtarza również log sterowania modelem jazdy.

Dla każdej reguły testujemy `good`, `minor` i `major` tam, gdzie dana waga istnieje, oraz warunek graniczny. Przypadki i uruchomienie opisuje [README testów](../tests/rules/README.md).

## 9. Debug overlay (F3)
Strefy (kolory), pasy (strzałki), klasy pierwszeństwa wlotów, aktualna faza świateł, TTC do najbliższych konfliktów, ostatnie 10 werdyktów oraz informacja o opanowaniu reguł (wyniki opanowania od M5).

## 10. Reguły `quiz-only`
Niektóre przepisy trudno sprawdzić w symulacji (np. dokładna treść rozmowy z dyspozytorem 112, kolumna > 15 rowerów poza misją). W `przepisy.yaml` mają `detektor: quiz-only` albo `detektor: scenka` (interaktywna scenka z wyborami, np. pierwsza pomoc). Nie udawaj wykrywania, którego nie ma.

## 11. Priorytety werdyktów i deduplikacja

Epizod wiąże kandydatów opisujących jedno zdarzenie. Wygrywa najpierw waga (`major` > `minor` > `good`), potem kolejność w tabeli. Osobne zdarzenia, np. brak kasku i niezasygnalizowany skręt, mają osobne werdykty.

| Zdarzenie | Przy równej wadze (od najwyższego priorytetu) | Klucz epizodu |
| --- | --- | --- |
| Wjazd na odcinek z zakazem B-9 | GDZIE-09 → ZNAK-B9 | Gracz + odcinek zakazu |
| Wymuszenie przy wyjeździe z posesji | MSC-03 → PIER-06 | Gracz + wyjazd |
| Jazda bez wymaganych świateł | MSC-04 → WYP-04 → WYP-05 | Gracz + ciągła jazda w warunkach ograniczonej widoczności |
| Wjazd z wlotu podporządkowanego | ZNAK-STOP → PIER-02 → ZNAK-A7 | Gracz + wlot + pojedynczy przejazd |
| Wjazd przy aktywnej sygnalizacji | SYG-01; przy warunkowym skręcie ZNAK-S2 | Gracz + wlot + pojedynczy przejazd |

STOP bez konfliktu daje `minor` za pominięcie zatrzymania albo `good` po postoju. Gdy gracz zatrzymał się prawidłowo i następnie wymusił pierwszeństwo, werdykt PIER-02 zastępuje pochwałę za STOP. Gdy pominął postój i jednocześnie wymusił pierwszeństwo, STOP przejmuje wagę i dowód konfliktu. W M2 detektory z pierwszych trzech wierszy należą do kolejnych etapów. WYP-06 ma wyłącznie werdykt `good` za wyposażenie w dodatkowe odblaski.

Ocena wjazdu odbywa się przy przekroczeniu skierowanej linii wlotu. W epizodach strefowych tolerancja wyjścia wynosi 0,25 s. Krótki powrót do tej samej strefy podtrzymuje stan epizodu, a czas poza strefą nie liczy się do progu naruszenia. Po wjeździe na skrzyżowanie epizod wygasa po 0,25 s poza obszarem albo po wycofaniu ponad 3 m przed linię. Bezpośredni przejazd po jezdni przez zebrę wzdłuż ruchu pojazdów nie jest użyciem przejścia.

### Wagi i progi M2

- KASK-01 daje `major` przy jeździe bez zapiętego kasku w przedziale poniżej 16 lat. Kask zapięty w czasie jazdy kwalifikuje się do pochwały raz na sesję. Prowadzenie roweru i jazda bez kasku w przedziale 16+ nie emitują naruszenia.
- GDZIE-01 i GDZIE-04 mają wyłącznie wagę błędu `minor`. Próg jezdni równoległej to ściśle więcej niż 3 s, tylko w przypisanym kierunku. Legalny wyjątek jest neutralny dla GDZIE-04 i nie emituje werdyktu. Zachowanie wobec pieszych nadal ocenia GDZIE-05. Werdykt `good` jest zarezerwowany dla reguł z `dobry_nawyk`.
- GDZIE-05 przy pieszym w promieniu 3 m daje `minor` za przekroczenie 2,5 m/s lub utrudnienie przejścia. Zagrożenie przy TTC < 1 s lub hamowanie ochronne daje `major`; sam wysoki odczyt prędkości bez konfliktu nie eskaluje.
- Dla GDZIE-06 sprawdzamy obecność pieszego przy wjeździe podczas korzystania z zebry. Przejazd rowerowy należy do osobnej kategorii.
- PIER-01/02 wykorzystują progi 2 s i 1 s z balansu. Równość z progiem nie zwiększa wagi. `good` wymaga przepuszczenia rzeczywistego konfliktowego uczestnika po zwolnieniu lub postoju. Trasy bez wspólnego punktu konfliktu nie powodują werdyktu.
- SYG-01 ocenia możliwość bezpiecznego postoju przy początku żółtego, a nie tuż przy linii. S-2 jest odrębnym sygnałem warunkowym wymagającym postoju i ustąpienia. MAN-01 ma wyłącznie wagę błędu `minor`; dokładnie 1,5 s zgodnego sygnału wystarcza.
