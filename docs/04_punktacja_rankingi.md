# 04 — Punktacja, progresja i rankingi

Wszystkie wartości liczbowe trzymaj w `content/balans.yaml` (łatwe strojenie). Poniżej wartości startowe.

## 1. Waluty i liczniki

| Nazwa | Co to | Za co | Na co |
|---|---|---|---|
| **Punkty misji** | Wynik pojedynczej misji | Ukończenie, dobre nawyki × combo, czas | Gwiazdki, rankingi misji |
| **XP Reputacji** | Postęp długoterminowy | Suma punktów misji / 2, osiągnięcia, quiz | Rangi |
| **Żetony** | Waluta kosmetyczna | Gwiazdki, osiągnięcia, wyzwania dzienne, napiwki NPC | Warsztat: kolory ramy, naklejki, wzory kasków, dźwięki dzwonka, ślady opon, avatary |
| **Mastery** | Opanowanie reguły (0–100) i modułu (średnia) | Poprawne zachowania w grze i odpowiedzi w quizie | Odblokowanie Licencji, „Mapa Umiejętności” |

**Zasada nadrzędna:** wyposażenie obowiązkowe (kask, światła, odblask, dzwonek, hamulec) **nigdy nie jest do kupienia** — jest darmowe i trzeba je *założyć/włączyć*. Za żetony kupuje się tylko wygląd.

## 2. Punkty w misji

| Zdarzenie | Punkty |
|---|---|
| Ukończenie misji | +1000 |
| Dobry nawyk (werdykt `good`: zasygnalizowanie skrętu, ustąpienie pierwszeństwa, pełne zatrzymanie na STOP, przeprowadzenie roweru przez pasy, obejrzenie się przed manewrem, włączenie świateł o zmroku…) | +50 × mnożnik combo |
| Bonus czasu (tylko jeśli 0 błędów `major`) | do +500, liniowo: pełny przy czasie ≤ `par_s`, 0 przy `limit_s` |
| Bonus płynności (przesyłka delikatna, pasek wstrząsów < 30%) | +200 |
| Błąd drobny (`minor`: brak sygnalizacji, jazda chodnikiem bez uprawnienia, brak świateł o zmroku…) | −150, reset combo, Uwaga Drogówki +1 |
| Błąd poważny (`major`: wjazd na czerwonym, nieustąpienie pieszemu na przejściu, wymuszenie pierwszeństwa z kolizją/near-miss, wjazd na przejazd przy opuszczanych zaporach) | −300, stop-klatka + lekcja, powrót do checkpointu, reset combo |
| 3 błędy poważne w misji | porażka misji (można od razu powtórzyć) |

**Gwarancja „skrót się nie opłaca”:** test jednostkowy w `progression/` musi wykazać, że dla każdej misji z oznaczonym skrótem `max(bonus_czasu_ze_skrótem) − kara(błędy na skrócie) < 0` w porównaniu z trasą zgodną z przepisami. Bonus czasu znika przy jakimkolwiek `major`.

## 3. Seria Bezpieczeństwa (combo)
Odpowiednik szału punktowego z GTA2, ale za dobre zachowania.
- Start ×1. Co 3 kolejne werdykty `good` bez `minor/major` → mnożnik +1, max **×5**.
- Przy ×3 i więcej wokół roweru pojawia się świecący ślad, DJ Dzwonek rzuca komentarz.
- `minor` lub `major` → reset do ×1.
- Seria trwa między misjami w wolnej jeździe (rekord „Najdłuższa Seria” do rankingu).

## 4. Uwaga Drogówki (odwrócone „gwiazdki poszukiwania” z GTA)
- Licznik 0–3 (ikonki gwizdka w HUD-zie). Każdy `minor` +1; `major` od razu 3.
- Przy 3: Sierżant Ola podjeżdża i zatrzymuje gracza (krótka scenka, nie kara). **Pytanie kontrolne** z banku, dobrane do reguły, którą właśnie złamano:
  - dobra odpowiedź → licznik 0, +100 pkt „Mądra Głowa”, +15 mastery reguły,
  - zła odpowiedź → wyjaśnienie (1–2 zdania) + licznik 1.
- Licznik spada o 1 co 60 s czystej jazdy.

## 5. Mastery (opanowanie przepisów)
Dla każdej reguły `ruleId`:
- `good` w grze: +10 (limit +30 na regułę na dzień — przeciw nabijaniu),
- poprawna odpowiedź w quizie: +15, błędna: −5,
- `minor`: −10, `major`: −20,
- zakres 0–100, start 0. Mastery modułu = średnia reguł modułu.
- **Ważenie treści:** prawdopodobieństwo wylosowania zdarzenia/pytania dla reguły ∝ `(100 − mastery) + 10`. Najsłabsze przepisy wracają najczęściej.
- **Pytania — system Leitnera:** 5 pudełek, odstępy 0/1/3/7/14 dni sesji gry; błąd → pudełko 1.
- **Mapa Umiejętności:** 8 odznak modułów (brąz ≥40, srebro ≥70, złoto ≥90).

## 6. Gwiazdki, rangi, Licencja

**Gwiazdki misji:**
- ★ — ukończona,
- ★★ — ukończona, max 1 błąd `minor`, 0 `major`,
- ★★★ — 0 błędów, czas ≤ `par_s`, liczba dobrych nawyków ≥ `min_dobre_nawyki`.
Żetony: 10 / 20 / 35 za 1/2/3 gwiazdki (płatne różnicowo przy poprawie wyniku).

**Rangi (XP):**
| Ranga | XP | Odblokowuje |
|---|---|---|
| Żółtodziób | 0 | Miasteczko, akt 1 |
| Kurier | 2 000 | Akt 2, quiz, wyzwania dzienne |
| Kurier Pro | 6 000 | Misje poboczne, nocne kursy |
| Pilot Miejski | 12 000 | Akt 3, rankingi tygodniowe |
| Mistrz Szlaku | 20 000 | Egzamin Licencji (+ wymóg mastery) |
| Legenda Szprychy | Licencja zdana | Złoty dzwonek, tryb Sezon, tytuł przy nicku |

**Egzamin „Licencja Szprychy”** (wartości w `balans.yaml`, domyślnie wzorowane na egzaminie szkolnym):
- Warunek dostępu: ranga Mistrz Szlaku + mastery każdego modułu ≥70.
- Teoria: 25 pytań losowanych proporcjonalnie z modułów, próg **80%**.
- Plac: 6 elementów, próg **90%** (element zaliczony = bez dotknięcia linii/pachołka i bez podparcia nogą).
- Przejazd kontrolny: trasa w mieście, 0 błędów `major`, max 2 `minor`.
- Wynik: certyfikat do wydruku (nick + data + wynik; imię wpisane lokalnie, opcjonalnie, nie wysyłane).
- Komunikat: „Licencja Szprychy to trening. Prawdziwą kartę rowerową wydaje szkoła po egzaminie.”

## 7. Rankingi

**Lokalne (MVP, offline):** najlepsze wyniki misji, rekord serii, najlepszy czas na placu, statystyki tygodnia.

**Online (M10, opcjonalne, za zgodą rodzica):**
| Ranking | Co się liczy | Reset |
|---|---|---|
| Misje na czas (per misja, per miasto) | Punkty, tylko przejazdy z 0 `major` | sezonowo |
| Tygodniowy XP | XP zdobyte w tygodniu | co poniedziałek |
| Najdłuższa Seria Bezpieczeństwa | Liczba `good` z rzędu | sezonowo |
| Plac manewrowy | Czas czystego przejazdu | sezonowo |
| Ranking klasy | XP i mastery uczniów z kodu klasy | ustala nauczyciel |
| Miasto kontra miasto | Suma czystych kilometrów graczy Warszawy vs Wrocławia | co tydzień (wydarzenie DJ-a Dzwonka) |

Zasady: nicki wyłącznie z generatora („Szybki Jeż 42”, „Dzielna Szprycha 7”), awatary z gry, brak czatu i wolnego tekstu. Pokazujemy top 50 + pozycję gracza. Ranking tygodniowy podzielony na ligi (Brąz/Srebro/Złoto, awans top 20%), żeby młodsze dzieci też miały szansę wygrać.

**Ochrona przed oszustwem:** serwer przyjmuje wynik z `seed`, wersją misji i skrótem logu wejść; v1 — walidacja wiarygodności (czas ≥ fizyczne minimum trasy, limity punktów); v2 — deterministyczne odtworzenie logu wejść na serwerze.

## 8. Osiągnięcia (przykłady; pełna lista w `content/osiagniecia.yaml`)
Ręka w górę (50 zasygnalizowanych skrętów) · Pan Pierwszeństwo (100× poprawnie ustąpione) · Zebra Friendly (30× przeprowadzony rower przez pasy) · Nocny Marek (10 nocnych kursów bez błędu) · Kolekcjoner (cały Album Znaków) · Krasnologia (100 krasnali) · Syreni Śpiew (10 syrenek) · Seria ×5 · Seria 100 · Złoty Plac · Mistrz Ronda · Pierwsza Pomoc · Turbo nawrócony · Obywatel Dwóch Miast (obie kampanie) · Legenda Szprychy.

## 9. Wyzwania dzienne i tygodniowe
- 3 wyzwania dziennie, generowane z szablonów, z naciskiem na najsłabszy moduł gracza: „Zasygnalizuj 10 skrętów”, „Przejedź 3 ronda bez błędu”, „Odpowiedz na 5 pytań o znaki”.
- Wyzwanie tygodnia miasta (fabularne, od DJ-a Dzwonka).
- Nagrody: żetony, rzadkie naklejki. **Brak** mechanik FOMO (żadnych serii dni z karą za przerwę, żadnych odliczanych ofert).

## 10. Zdrowe nawyki gry
Po 30 min gry (konfigurowalne przez rodzica): Kazik proponuje przerwę („Czas na prawdziwy rower! Kask na głowę!”). Bez blokady, ale bez nagród za maraton.
