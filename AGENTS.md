# AGENTS.md — MASTER PROMPT dla Codexa

## Projekt: **SZPRYCHA: Miejscy Kurierzy**
Edukacyjna gra akcji z widokiem z góry (styl GTA2, pixel-art) dla dzieci 9–12 lat, która przygotowuje do egzaminu na **kartę rowerową** w Polsce. Gracz jest młodym kurierem rowerowym, wykonuje misje w pixel-artowych wersjach Warszawy i Wrocławia, zdobywa nagrody i rangi — a przepisy ruchu drogowego poznaje *przy okazji*, bo to one decydują o wyniku.

Ty (Codex) budujesz całą grę: kod, silnik zasad, testy, narzędzia, grafiki zastępcze (placeholdery) i pipeline buildów (web → PWA → Android/iOS).

---

## 1. Kolejność czytania dokumentacji (OBOWIĄZKOWO przed pierwszym commitem)

1. `docs/01_wizja_i_zakres.md` — wizja, filary, zakres MVP, czego NIE robimy
2. `docs/07_silnik_zasad.md` — **serce gry**, architektura reguł i wykrywania naruszeń
3. `docs/02_fabula.md` — świat, postacie, łuki fabularne
4. `docs/03_misje.md` — misje, typy misji, schemat danych misji
5. `docs/04_punktacja_rankingi.md` — punkty, combo, gwiazdki, mastery, rankingi
6. `docs/05_mapy.md` — mapy Warszawy i Wrocławia (skala mikro), dzielnice, landmarki
7. `docs/06_art_direction.md` — styl graficzny, rozdzielczość, paleta, efekt 2.5D bloków, lista assetów
8. `docs/08_ux_sterowanie_audio.md` — sterowanie, HUD, dialogi, audio, dostępność
9. `docs/09_prywatnosc_sklepy.md` — RODO, dzieci, Google Play Families, Apple Kids
10. `dydaktyka/` — merytoryka: moduły M01–M08 (źródło prawdy o przepisach)
11. `content/` — dane gry: `przepisy.yaml`, `znaki.yaml`, `pytania.json`, `osiagniecia.yaml`
12. `docs/zrodla_i_stan_prawny.md` — źródła i zastrzeżenia prawne

**Hierarchia źródeł prawdy:** `dydaktyka/` + `content/przepisy.yaml` > pozostałe dokumenty. Jeśli fabuła lub misja przeczy przepisom — wygrywa przepis, zgłoś konflikt w `NOTES_FOR_HUMAN.md`.

---

## 2. Zasady nienaruszalne (non-negotiables)

1. **Poprawność merytoryczna ponad wszystko.** Gra nie może nagradzać łamania przepisów ani uczyć błędnie. Każda reguła w kodzie ma `ruleId` z `content/przepisy.yaml`. Nie wymyślaj przepisów. Reguły oznaczone `weryfikacja: true` implementuj normalnie, ale wypisz je w `NOTES_FOR_HUMAN.md` do sprawdzenia przez konsultanta.
2. **Treść w danych, nie w kodzie.** Przepisy, pytania, znaki, misje, dialogi, teksty UI → pliki YAML/JSON + `i18n/pl.json`. Zero polskich stringów zaszytych w TS (poza logami deweloperskimi). Powód: przepisy się zmieniają (planowana reforma karty rowerowej, ogólnopolski bank pytań) — aktualizacja ma być zmianą danych.
3. **Bez przemocy.** Brak krwi, zniszczeń, potrąceń z obrażeniami. Kolizja / bliskie zdarzenie = „UPS!”, stop-klatka, lekcja, powtórka. Pojazdy AI zawsze hamują przed graczem (nigdy go „nie zabijają”), ale wykrywamy, że gracz *spowodował* sytuację niebezpieczną.
4. **Nauka przez akcję, nie przez wykład.** Maks. 1 zdanie wyjaśnienia na raz (≤140 znaków), zawsze w kontekście tego, co się właśnie stało. Żadnych ekranów z blokami tekstu w trakcie misji.
5. **Prywatność dziecka.** Domyślnie zero danych osobowych, zero zewnętrznej analityki i reklam, brak czatu, brak wolnego tekstu od użytkownika (nicki z generatora). Szczegóły: `docs/09`.
6. **Bez cudzych marek.** Nie używaj nazw/assetów GTA, logotypów klubów, nazw sponsorskich stadionów (piszemy „Stadion Narodowy”, „Stadion Wrocław”), logotypów sklepów, prawdziwych rzeźb krasnali (projektujemy własne krasnale). Wszystkie assety własne, wygenerowane albo na licencji CC0/OFL (zapisz licencję w `assets/LICENSES.md`).
7. **Polskie znaki wszędzie.** Font pikselowy musi mieć ą ę ć ł ń ó ś ź ż (+ wielkie). Dodaj test wizualny/jednostkowy renderowania pangramu „Zażółć gęślą jaźń”.
8. **Deterministyczny silnik zasad** — czysty TypeScript bez zależności od Phasera, testowalny w Node (vitest), z testami scenariuszowymi.

---

## 3. Stos technologiczny (nie zmieniaj bez uzasadnienia w `NOTES_FOR_HUMAN.md`)

| Obszar | Wybór |
|---|---|
| Język | TypeScript (strict) |
| Silnik gry | Phaser 3 (najnowsza stabilna 3.x) — `pixelArt: true`, `roundPixels: true` |
| Bundler | Vite |
| Mapy | Tiled (`.tmj` JSON), warstwy kafelków + warstwy obiektów (strefy, znaki, pasy ruchu) |
| Dane | YAML (`content/`) → walidacja **zod** w czasie builda → JSON w `public/data/` |
| Testy | vitest (silnik zasad, punktacja, mastery, parsery), Playwright (smoke test web) |
| Lint/format | ESLint + Prettier |
| Zapis stanu | IndexedDB (idb-keyval) z wersjonowaniem schematu i migracjami |
| PWA | vite-plugin-pwa (offline, instalowalna) |
| Mobile | Capacitor (Android + iOS), orientacja pozioma, telefon + tablet |
| Backend (od M10, opcjonalny) | Supabase lub lekki serwer Node — tylko rankingi i kody klas, bez danych osobowych |
| CI | GitHub Actions: lint, test, build web, build Android (debug APK); iOS — instrukcja w `docs/BUILD_IOS.md` |

---

## 4. Architektura i struktura katalogów

```
/src
  /core            # pętla gry, event bus, konfiguracja, zapis stanu
  /rules           # SILNIK ZASAD (czysty TS, bez Phasera!)
    /world         # WorldModel: strefy, pasy, skrzyżowania, znaki, sygnalizacja
    /detectors     # 1 plik = 1 reguła (ruleId), zwraca Verdict
    /priority      # IntersectionManager: kto ma pierwszeństwo, konflikty
    RuleEngine.ts
  /sim             # AI ruchu: auta, tramwaje, piesi, rowerzyści, pojazdy uprzywilejowane
  /gameplay        # misje, checkpointy, zdarzenia losowe, kolekcje (album znaków, krasnale)
  /progression     # punkty, combo, gwiazdki, żetony, rangi, mastery, osiągnięcia
  /render          # renderer 2.5D bloków (efekt GTA2), kamera, oświetlenie nocne
  /scenes          # Boot, Preload, MainMenu, CityPicker, Garage, City, Plac, Quiz, Exam, Results
  /ui              # HUD, dialogi, minimapa, strzałka celu, stop-klatka, menu
  /audio           # radio, SFX, lektor (Web Speech API pl-PL)
  /content         # loadery + schematy zod
  /platform        # web/capacitor: haptyka, orientacja, safe-area
/content           # YAML/JSON źródłowe (edytowane przez ludzi)
/maps              # Tiled: warszawa.tmj, wroclaw.tmj, miasteczko.tmj, tilesety
/assets            # sprite'y, tilesety, fonty, audio (+ LICENSES.md)
/tools             # skrypty: walidacja treści, generator placeholderów pixel-art, eksport map
/tests
  /rules           # testy scenariuszowe silnika zasad (YAML → oczekiwane werdykty)
/docs, /dydaktyka  # dokumentacja (nie zmieniaj merytoryki bez zgłoszenia)
```

**Kluczowe kontrakty** (szczegóły w `docs/07`):
- `Verdict { ruleId, kind: 'good' | 'minor' | 'major', at, evidence, feedbackKey }`
- Silnik zasad emituje werdykty na event bus → konsumują je: `ScoreSystem`, `MasterySystem`, `FeedbackUI`, `MissionSystem`, `AchievementSystem`.
- Mapa Tiled zawiera **semantykę drogi** w warstwach obiektów (`zones`, `lanes`, `intersections`, `signs`, `signals`, `crossings`, `triggers`, `spawns`, `pois`). Grafika i semantyka są rozdzielone.

---

## 5. Kamienie milowe (realizuj po kolei; każdy kończy się działającym buildem i zielonymi testami)

**M0 — Szkielet.** Vite+Phaser+TS, lint, vitest, CI, sceny Boot/Preload/MainMenu, font z PL znakami, loader treści z walidacją zod (build pada przy błędnych danych). 
*DoD:* `npm run dev` pokazuje menu z pangramem; `npm test` zielony; CI zielone.

**M1 — Jazda i świat.** Testowa mapa Tiled (miasteczko ruchu), rower z modelem jazdy (przyspieszanie, hamowanie, skręt, zsiadanie i prowadzenie roweru), kamera z wyprzedzeniem w kierunku jazdy, **renderer 2.5D bloków** (docs/06 §4), kolizje ze ścianami/krawężnikami, sterowanie klawiatura/gamepad/dotyk (2 schematy: „Proste” i „Klasyczne”).
*DoD:* płynne 60 FPS na średnim telefonie z Androidem (test w Chrome DevTools throttling 4×), budynki mają efekt wysokości.

**M2 — Silnik zasad v1.** WorldModel z warstw Tiled, ZoneTracker, detektory dla: KASK-01, GDZIE-01, GDZIE-04, GDZIE-05, GDZIE-06, ZNAK-STOP, SYG-01, PIER-01, PIER-02, MAN-01. Testy scenariuszowe (min. 3 na regułę: poprawnie / błąd drobny / błąd poważny).
*DoD:* ≥30 testów scenariuszowych zielonych; debug overlay (F3) pokazuje strefy, pierwszeństwo i ostatnie werdykty.

**M3 — Ruch drogowy AI.** Graf pasów z polilinii Tiled, auta respektujące światła i pierwszeństwo (ten sam IntersectionManager), piesi na chodnikach i przejściach, tramwaje po torach, rowerzyści AI, pojazd uprzywilejowany jako zdarzenie. Pozostałe detektory z `przepisy.yaml`.
*DoD:* 10 min symulacji bez zakleszczeń (test headless), wszystkie reguły z `przepisy.yaml` mają detektor albo oznaczenie `detektor: quiz-only`.

**M4 — Misje i fabuła.** System misji wg schematu z `docs/03` (cele, checkpointy, timery, warunki porażki), dialogi z portretami, zlecenia przez „SzprychaApp” (telefon w HUD), strzałka celu GTA2, stop-klatka z powtórką ostatnich 5 s, zdarzenia losowe.
*DoD:* akt 1 Warszawy grywalny od początku do końca.

**M5 — Progresja.** Punkty, combo „Seria Bezpieczeństwa”, licznik „Uwaga Drogówki”, gwiazdki, żetony, rangi, mastery per reguła i moduł, Album Znaków, osiągnięcia, wyzwania dzienne, zapis w IndexedDB z migracjami.
*DoD:* testy jednostkowe punktacji pokrywają wszystkie przypadki z `docs/04`.

**M6 — Mapy Warszawa i Wrocław.** Pełne mapy wg `docs/05`, landmarki jako bloki z własnymi teksturami (placeholdery wg `docs/06`), wybór miasta na pixel-artowej mapie Polski, wszystkie misje MVP z `docs/03`.
*DoD:* każdy moduł M01–M07 jest ćwiczony w każdym mieście (raport generowany przez `tools/coverage-report.ts`).

**M7 — Plac manewrowy, quiz, egzamin próbny.** Plac (ósemka, slalom, tor wąski, zatrzymanie w polu, ruszanie z sygnalizacją, jazda jedną ręką), quiz z banku pytań (system Leitnera), egzamin próbny z konfigurowalnymi progami (domyślnie 80% teoria / 90% praktyka), „Licencja Szprychy” (certyfikat do wydruku — bez danych osobowych poza nickiem i opcjonalnym imieniem wpisanym tylko lokalnie).
*DoD:* egzamin działa w całości offline.

**M8 — Audio i szlif.** Radio Szprycha FM (3 stacje chiptune, dżingle z poradami), SFX, lektor TTS, efekty nocy (stożek światła, odblaski świecące w reflektorach), pogoda (deszcz, mgła, śnieg — wpływ na przepisy: GDZIE-04), ekran wyników z „momentem chwały”.
**M9 — PWA + Capacitor.** Instalowalne PWA offline, buildy Android/iOS, układ UI pod telefon i tablet, safe-area, wydajność, ikony, splash.
**M10 — Rankingi online i panel klasy (opcjonalny backend).** Wg `docs/04 §7` i `docs/09`.

---

## 6. Grafika — jak masz postępować
Nie jesteś grafikiem, więc:
1. Zbuduj **generator placeholderów** (`tools/gen-placeholders.ts`), który rysuje kafelki/sprite'y w palecie z `docs/06` (kształty, kolory, proste detale), z prawidłowymi wymiarami i nazwami z manifestu.
2. Utrzymuj `assets/manifest.json` (id, rozmiar, klatki animacji, kierunki, opis z `docs/06`) — artysta/narzędzie AI podmieni pliki 1:1 bez zmian w kodzie.
3. Landmarki (PKiN, Stadion Narodowy, Hala Stulecia, Sky Tower…) mają być **rozpoznawalne już w placeholderze** dzięki sylwetce i kolorom (opisy w `docs/06 §6`).

---

## 7. Jakość i sposób pracy
- Małe, opisane commity (Conventional Commits), jeden kamień milowy = jedna gałąź/PR.
- Każdy detektor reguły: plik + testy scenariuszowe + wpis w `tests/rules/README.md`.
- Wydajność: budżet 16 ms/klatkę na telefonie średniej klasy; pooling obiektów; brak alokacji w pętli silnika zasad.
- Po każdym kamieniu milowym zaktualizuj `PROGRESS.md` (co zrobione, co odroczone, znane błędy) i `NOTES_FOR_HUMAN.md` (pytania merytoryczne, decyzje do podjęcia, reguły do weryfikacji).
- Jeśli coś w dokumentacji jest niejasne — wybierz najbezpieczniejszą dydaktycznie interpretację, zapisz decyzję i jedź dalej.

## 8. Czego NIE robić
- Nie dodawaj trybu „bez zasad”, w którym łamanie przepisów jest nagradzane.
- Nie używaj zewnętrznych SDK analitycznych/reklamowych, logowania przez social media, czatu.
- Nie odwzorowuj prawdziwego układu ulic — miasta to **kolaże charakterystycznych miejsc** w skali mikro.
- Nie pokazuj obrażeń, karetki z poszkodowanym dzieckiem, policji jako zagrożenia. Sierżant Ola jest mentorką.
- Nie wymagaj połączenia z internetem do gry (poza rankingami).
