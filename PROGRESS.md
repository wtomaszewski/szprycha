# Postęp projektu

Stan: 21.11.2026. Gałąź: `feat/m0-szkielet`.

| Kamień | Zakres                                      | Status                                                |
| ------ | ------------------------------------------- | ----------------------------------------------------- |
| M0     | Szkielet, menu, treści, narzędzia i CI web  | Ukończony — kontrole lokalne i GitHub Actions zielone |
| M1     | Jazda, testowa mapa, kamera, bloki 2.5D     | Nierozpoczęty                                         |
| M2     | Silnik zasad v1                             | Nierozpoczęty                                         |
| M3     | Ruch drogowy AI i pozostałe detektory       | Nierozpoczęty                                         |
| M4     | Misje i fabuła                              | Nierozpoczęty                                         |
| M5     | Punktacja, progresja, zapis                 | Nierozpoczęty                                         |
| M6     | Mapy Warszawy i Wrocławia                   | Nierozpoczęty                                         |
| M7     | Plac, quiz, egzamin                         | Nierozpoczęty                                         |
| M8     | Audio i szlif                               | Nierozpoczęty                                         |
| M9     | PWA, Capacitor, Android/iOS                 | Nierozpoczęty                                         |
| M10    | Rankingi online i panel klasy (opcjonalnie) | Nierozpoczęty                                         |

## Przygotowanie

- Rozpakowano zawartość nadrzędnego `szprycha/` do root; porównano bajty z ZIP-em przed jego usunięciem.
- Utworzono repozytorium Git. Pierwszy commit: `351da20` — `docs: dokumentacja projektu`.
- Źródłowe AGENTS.md, README.md, docs/, dydaktyka/ i content/ zachowane bez zmian; formatowanie ich nie dotyka.
- Przeczytano pełną dokumentację. Podsumowanie, konflikty, 20 reguł do recenzji i plan ograniczenia ryzyk: `NOTES_FOR_HUMAN.md`.

## M0 — wykonane

- Vite, Phaser 3.90.0, TypeScript strict, ESLint, Prettier, vitest, lockfile i Node 24 w `.nvmrc`.
- Boot czeka na lokalny font; Preload pobiera i waliduje dane; MainMenu wyświetla tytuł, pangram i informację o przyszłej kampanii.
- Pixelify Sans z OFL, glify polskich małych i wielkich liter sprawdzane na rzeczywistym pliku fontu; zrzut menu obejrzany.
- Polskie teksty UI w `i18n/pl.json`, ustawienia pixelArt/roundPixels i całkowity zoom logicznego ekranu 640×360.
- Ścisłe schematy zod wszystkich pięciu plików content; kontrola ID, odwołań i zagnieżdżonych warunków osiągnięć, indeksów odpowiedzi i zakresów balansu.
- Vite generuje `public/data/content.json` po walidacji zarówno w dev, jak i build; zmiana content powoduje restart dev. Błędy zatrzymują build. Loader przeglądarkowy waliduje ponownie.
- GitHub Actions: npm ci → lint → format → test → build → smoke Chromium; screenshot jako artefakt.

## Weryfikacja

- `npm ci` — czysta instalacja zależności z lockfile.
- `npm run lint` i `npm run format:check` — zielone.
- `npm test` — 8 testów zielonych, w tym rzeczywiste wywołanie `npm run build` na tymczasowej kopii ze złym ruleId (build poprawnie odmawia).
- `npm run build` — zielony, sprawdza też typy.
- `npm run test:e2e` — 2 testy zielone na serwerze `npm run dev`: przejście do menu oraz komunikat przy błędzie HTTP treści.
- `test-results/menu.png` — lokalny zrzut menu, nie jest wersjonowany.
- GitHub Actions — **zielone** dla commitu `02d271f`: [run PR](https://github.com/wtomaszewski/szprycha/actions/runs/44895919210) i [run push](https://github.com/wtomaszewski/szprycha/actions/runs/44895915338). Wszystkie kroki, także smoke Chromium, zakończone sukcesem na Ubuntu / Node 24.
- Pierwszy run ujawnił zależność testu od lokalnego katalogu public/. Naprawiono: test sam generuje poprawny JSON w tymczasowym katalogu przed wprowadzeniem błędnego ruleId.
- Kod wysłano do `wtomaszewski/szprycha`; [PR #1](https://github.com/wtomaszewski/szprycha/pull/1) jest roboczy, bez scalania do main.

## Uruchomienie

```sh
npm ci
npm run dev
```

Adres wypisuje Vite (domyślnie http://127.0.0.1:5173). Build: `npm run build`; podgląd builda: `npm run preview`.

```sh
npm test
npm run lint
npm run format:check
npx playwright install chromium
npm run test:e2e
```

## Odroczone i znane ograniczenia

- M1 nie rozpoczęto. Menu nie uruchamia jazdy; brak map, sterowania rowerem i renderera 2.5D. Nie implementowano silnika zasad ani quizu.
- Android/iOS i offline PWA należą do M9, nie do CI M0.
- Vite ostrzega o rozmiarze osobnego fragmentu Phasera (~1,2 MB przed gzip). Build przechodzi; optymalizacja zasobów świata nastąpi po ich dodaniu.
- Na oknach mniejszych niż 640×360 zachowujemy skalę 1:1 i przewijanie. Docelowe układy tabletów/telefonów są do realizacji w kolejnych etapach.
- Pięć opisów dla_dziecka przekracza deklarowane 160 znaków; zachowano treść, zgłoszono w notatkach, limit ten nie jest obecnie egzekwowany. Feedback ≤140 jest walidowany.
