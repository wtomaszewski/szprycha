# Audyt wydajności i rozmiaru paczki

23.11.2026 · #123 · Punkt odniesienia to produkcyjny build z `main` na `306d395`, z Radiem FM 2.0 i kampanią Krakowa.

## Rozmiar PWA

Rozmiary to bajty plików przed kompresją HTTP. Pierwsze pobranie liczy każdy plik z manifestu precache oraz skrypt Service Workera raz. Cały `dist` obejmuje także pobierane później zasoby i stronę nauczyciela.

| Obszar | Przed | Po | Limit CI |
| --- | ---: | ---: | ---: |
| Cały `dist` | 17 793 215 B | 17 804 382 B | 60 000 000 B |
| Precache | 17 778 611 B | 3 670 193 B | — |
| Pierwsze pobranie PWA | 17 782 513 B | **3 677 876 B** | **8 000 000 B** |
| Zasoby pobierane przy użyciu | 0 B | 14 115 804 B | — |

Oszczędność przy pierwszym pobraniu wynosi **79,3%**. Rozmiar plików radia i bitrate pozostały bez zmian. Menu, samouczek, Miasteczko, plac i treści lekcji są dostępne po instalacji. Po wejściu do Warszawy, Wrocławia lub Krakowa PWA zapisuje konkretną mapę. Po uruchomieniu stacji zapisuje jej dżingiel i utwory. Nagrania lektora są obsługiwane pojedynczo. Build audytu zawiera manifest dostępnych tekstów i zero nagrań lektora. Paczki Capacitor zawierają zasoby lokalnie i zachowują dostęp offline od instalacji. Od #93 `dist` zawiera nagrania lektora Azure (636 kwestii w Opus i AAC, ok. 31 MB, pobierane pojedynczo), dlatego limit całego `dist` wynosi 60 000 000 B. Limit pierwszego pobrania się nie zmienia.

Cache ma zasięg instalacji PWA. Aktualizacja zachowuje pobrane zasoby o zgodnym skrócie zawartości i usuwa stare wersje. Test E2E przeładowuje grę bez sieci, odtwarza lokalne radio, otwiera wcześniej pobraną mapę i sprawdza jej dostępność po aktualizacji.

## Czas startu

Chromium 156.0.8078.79 headless, 1280 × 720, CPU 4×, Fast 3G przez CDP (1,6 Mb/s pobierania, 0,75 Mb/s wysyłania i 150 ms opóźnienia). Mediana trzech prób w świeżych kontekstach z odtworzonym zapisem gracza po wprowadzeniu. Service Worker wyłączony na czas pomiaru, żeby mierzyć pierwsze otwarcie bez cache. Punkt startu jazdy to pierwsza gotowa pozycja roweru. Czas z menu obejmuje wybór miasta w Wolnej jeździe.

| Mapa | Otwarcie → menu przed | Otwarcie → menu po | Menu → jazda przed | Menu → jazda po |
| --- | ---: | ---: | ---: | ---: |
| Miasteczko | 5,68 s | 4,91 s | 5,46 s | 6,34 s |
| Warszawa | 5,77 s | 4,96 s | 8,20 s | 9,34 s |
| Wrocław | 5,65 s | 4,86 s | 8,71 s | 10,33 s |
| Kraków | 5,57 s | 5,02 s | 6,98 s | 9,42 s |

Kod jazdy, wyboru miasta i placu jest ładowany przy otwarciu scen. Menu jest szybsze, a część pracy przechodzi na pierwsze wejście do jazdy. W drugim etapie weryfikacji liczą się osobne limity **7 s** do menu i **12 s** z menu do jazdy dla każdej mapy. W porównaniu z najwolniejszymi medianami jest to odpowiednio około 2,0 s i 1,7 s zapasu.

### Zimne wejście do jazdy na dziewięciu mapach (#167)

Punktem odniesienia jest produkcyjny build `main` z `52a9501`. Obie wersje zmierzono według tych samych ustawień Chromium i CDP opisanych wyżej. `benchmark:startup` wywodzi listę miast z katalogu Wolnej jazdy i dodaje Miasteczko. CI sprawdza oba limity dla wszystkich dziewięciu map.

Wybór miasta uruchamia pobranie jego pliku Tiled wraz z importem sceny jazdy. Phaser dołącza rozpoczęte żądanie mapy do kolejki atlasów. Dane mapy korzystają z dotychczasowej pamięci podręcznej Phasera i Service Workera. Atlasy mają indeksowaną paletę PNG. Test generatora porównuje każdy zdekodowany piksel RGBA. Przed pierwszą klatką gra rasteruje fragmenty terenu w zasięgu kamery. Przy przewijaniu kolejne fragmenty są przygotowywane przed wyświetleniem.

| Mapa | Otwarcie → menu przed | Otwarcie → menu po | Menu → jazda przed | Menu → jazda po | Skrócenie |
| --- | ---: | ---: | ---: | ---: | ---: |
| Miasteczko | 5,75 s | 5,70 s | 7,15 s | 5,45 s | 23,7% |
| Warszawa | 5,74 s | 5,64 s | 10,23 s | 8,01 s | 21,7% |
| Wrocław | 5,76 s | 5,65 s | 12,35 s | 7,18 s | 41,8% |
| Kraków | 5,80 s | 5,65 s | 9,99 s | 7,54 s | 24,6% |
| Gdańsk | 5,67 s | 5,71 s | 10,32 s | 7,66 s | 25,8% |
| Wieś i las | 5,69 s | 5,80 s | 8,47 s | 6,64 s | 21,6% |
| Poznań | 5,66 s | 5,77 s | 9,17 s | 6,56 s | 28,5% |
| Łódź | 5,71 s | 5,76 s | 9,34 s | 6,40 s | 31,4% |
| Zakopane | 5,69 s | 5,75 s | 9,09 s | 6,79 s | 25,3% |

Wszystkie mediany mieszczą się w limitach. Najdłuższe przejście do jazdy po zmianie to 8,01 s w Warszawie. Pierwsze pobranie PWA zajmuje 4 125 164 B wobec 4 341 736 B przed zmianą. Mapy miast pozostają pobierane na żądanie.

Na trasie dziennej w Miasteczku `benchmark:driving` dał **59,19 → 59,28 FPS** oraz **16,8 → 16,7 ms p95**. To mediany trzech prób Canvas przy CPU 4×, z 11 sekundami pomiaru w każdej próbie.

## FPS i p95 klatki

Chromium headless w trybie Canvas, 1280 × 720, CPU 4×, profil pełny. `benchmark:driving` próbuje jechać z niewielkim wychyleniem joysticka na tej samej trasie po obu stronach porównania. Radio i Service Worker są wyłączone w próbach FPS i pamięci. Pierwsza sekunda jazdy jest rozgrzewką, kolejne 11 sekund wchodzi do pomiaru. Noc obejmuje włączoną lampkę roweru i wizualny lekki deszcz. W pomiarze osobnym rower stoi przy sygnalizatorach w Miasteczku, z aktywnym ruchem drogowym.

| Mapa i scenariusz | FPS przed | FPS po | p95 przed (ms) | p95 po (ms) |
| --- | ---: | ---: | ---: | ---: |
| Miasteczko · dzień | 58,8 | 59,0 | 16,8 | 16,7 |
| Miasteczko · noc i deszcz | 47,2 | 54,0 | 33,4 | 16,8 |
| Warszawa, Praga · dzień | 53,7 | 55,5 | 16,8 | 16,8 |
| Warszawa, Praga · noc i deszcz | 55,6 | 57,0 | 16,8 | 16,8 |
| Wrocław, Bulwary · dzień | 56,9 | 58,1 | 16,8 | 16,8 |
| Wrocław, Bulwary · noc i deszcz | 59,5 | 59,5 | 16,8 | 16,8 |
| Kraków, Rynek · dzień | 58,6 | 59,3 | 16,8 | 16,8 |
| Kraków, Rynek · noc i deszcz | 59,3 | 59,5 | 16,8 | 16,8 |

| Skrzyżowanie w Miasteczku (#118) | FPS przed | FPS po | p95 przed (ms) | p95 po (ms) |
| --- | ---: | ---: | ---: | ---: |
| Liczniki włączone | 59,5 | 59,8 | 16,7 | 16,8 |
| Liczniki wyłączone | 56,8 | 60,0 | 16,8 | 16,7 |

Tabela podaje mediany trzech prób dla Miasteczka w dzień, Wrocławia i Krakowa nocą oraz skrzyżowania z licznikami. Pozostałe wiersze pokazują po jednej próbie każdej wersji. W dodatkowych powtórkach ograniczono pozostałe obciążenie maszyny, ponieważ pojedyncze długie klatki wpływały na średnią FPS. Zmiana o 0,1 ms na skrzyżowaniu odpowiada rozdzielczości znaczników czasu Chromium.

Porównanie profilu niskiego po zmianie na Pradze nocą w deszczu dało 58,6 FPS i p95 16,8 ms.

## Pamięć i przełączanie miast

Chromium headless, WebGL programowy SwiftShader, 1280 × 720 i CPU 4×. Ten sam profil wraca przez menu do każdej mapy w trzech rundach, z powtarzanym odcinkiem jazdy i łącznie dziesięcioma minutami aktywnego sterowania. Po odśmiecaniu CDP raportuje stertę JavaScript i liczbę słuchaczy DOM. Tekstury to liczba alokacji WebGL pomniejszona o wywołania ich usunięcia.

| Punkt pomiaru | Sterta przed / po (MiB) | Tekstury przed / po | Słuchacze DOM przed / po |
| --- | ---: | ---: | ---: |
| Miasteczko, początek jazdy | 18,05 / 16,96 | 197 / 197 | 303 / 303 |
| Menu po Miasteczku | 24,03 / 21,69 | 1295 / 202 | 278 / 278 |
| Menu po Warszawie | 24,31 / 22,54 | 1295 / 489 | 277 / 277 |
| Menu po Wrocławiu | 24,36 / 22,65 | 1295 / 553 | 277 / 277 |
| Menu po Krakowie | 24,15 / 22,15 | 1295 / 387 | 277 / 277 |
| Miasteczko, końcowy powrót | 24,01 / 21,59 | 1323 / 230 | 303 / 303 |

Po drugiej rundzie liczby tekstur w menu ustabilizowały się dla poszczególnych map. Po końcowym powrocie do Miasteczka liczba aktywnych tekstur spadła z 1323 do 230, a liczba słuchaczy DOM była taka sama jak na początku próby.

Gra zachowuje cache plików mapy na dysku. Przy wejściu na inną mapę usuwa poprzednią mapę Tiled z pamięci oraz jej tekstury podłoża, elewacji, znaków i dekoracji. Wspólne atlasy pozostają dostępne. Generowanie podłoża rysuje oznakowanie tylko w zajętych fragmentach.

## Odtworzenie pomiarów

- Po `npm ci` uruchom `npm run build` i `npm run budget:bundle`. Podaj drugi katalog jako `npm run budget:bundle -- <dist>`, aby porównać rewizje.
- Po `npx playwright install chromium` uruchom `npm run benchmark:startup -- --check`. Polecenie samo wystawia bieżący `dist`. Aby użyć innego buildu, ustaw `BENCH_URL` na adres jego podglądu. Opcja `--waterfall` wypisuje czasy żądań CDP w milisekundach względem kliknięcia mapy lub przycisku Miasteczka.
- Przy uruchomionym podglądzie ustaw `BENCH_URL`, `BENCH_RENDERER=canvas` i `BENCH_MAP`, a następnie uruchom `npm run benchmark:driving`. Dla Wrocławia w tym porównaniu użyj `BENCH_FRAGMENT=bulwary`. Noc z deszczem ustawia `BENCH_LIGHT=night BENCH_RAIN=1`. Skrzyżowanie mierzy `BENCH_FRAGMENT=sygnalizacja` z `BENCH_COUNTDOWNS=on` i `off`.
- Przy uruchomionym podglądzie ustaw `BENCH_URL` i uruchom `npm run benchmark:memory`. Polecenie wypisuje pomiar początkowy, pomiary w menu po każdym mieście i końcowy powrót do Miasteczka.
- Uruchom `npm run test:e2e -- tests/e2e/pwa.spec.ts tests/e2e/graphics-quality.spec.ts` do odtworzenia prób offline, aktualizacji i ręcznego wyboru jakości. Automatyka używa liczby procesorów logicznych oraz czasu klatek lokalnie w pamięci. W profilu pozostaje wyłącznie wybrana opcja grafiki.

[Ustawienie jakości grafiki w pauzie na ekranie telefonu](screenshots/123-jakosc-grafiki.png)

## Odłożone pozycje

- Powtórzenie pomiarów na fizycznym Androidzie oraz iPadzie i w Safari. Wynik Canvas i liczba tekstur WebGL w Chromium opisują warunki testu, a pomiar na urządzeniu pokaże FPS i faktyczne zużycie pamięci GPU.
- Ponowienie odsłuchu lektora offline po dodaniu nagrań do katalogu.
