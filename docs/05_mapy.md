# 05 — Mapy miast (skala mikro)

## Zasady ogólne
- **Nie odwzorowujemy układu ulic.** Każde miasto to **kolaż 5 dzielnic** zbudowany wokół charakterystycznych miejsc, połączonych drogami, mostami i torami tramwajowymi. Rozpoznawalne sylwetki pomagają poczuć charakter miasta.
- **Skala:** kafel 32×32 px ≈ 1,5 m. Jezdnia 2 pasy = 4–5 kafli, chodnik 2 kafle, DDR 1–2 kafle. Landmarki są **przeskalowane w dół** (PKiN ~10×10 kafli podstawy, nie 100×100) — skala symboliczna, jak w makiecie.
- **Rozmiar mapy miasta:** ok. 200×150 kafli (6400×4800 px), jedna mapa Tiled na miasto, podział na dzielnice warstwą obiektów `districts`. Dzielnice odblokowywane fabularnie (zablokowane = szlaban/„roboty drogowe” z humorem).
- **Każde miasto musi zawierać komplet sytuacji drogowych** potrzebnych do modułów M01–M07 (tabela pokrycia na końcu). Raport `tools/coverage-report.ts` sprawdza to automatycznie z warstw obiektów.
- **Wybór mapy:** scena `CityPicker` — pixel-artowa mapa Polski z pinezkami. Warszawa, Wrocław, Kraków i Gdańsk są dostępne od startu w Kampanii i Wolnej jeździe.

## Warstwy Tiled (wymagane, nazwy dokładnie takie)
| Warstwa | Typ | Zawartość |
|---|---|---|
| `ground` | tile | asfalt, chodnik, kostka, kocie łby, trawa, woda, tory |
| `markings` | tile | pasy, linie, P-10, P-11, P-12, P-13, P-23, strzałki |
| `blocks` | object | budynki jako prostokąty/poligony: `height` (piętra), `roof`, `wall`, `landmarkId` |
| `props` | object | drzewa, ławki, latarnie, słupki, wiaty, kolumna, fontanny |
| `zones` | object | `roadway`, `sidewalk`, `bike_path`, `bike_lane`, `shared_path`, `shoulder`, `living_zone`, `pedestrian_zone`, `park_path`, `no_bikes`, `rail` |
| `lanes` | object (polyline) | skierowane wloty, odcinki między skrzyżowaniami i wyjazdy na granicy mapy |
| `intersections` | object | obszar skrzyżowania, `kind: equal / priority / signals / roundabout`, wloty z oznaczeniem pierwszeństwa |
| `crossings` | object | `pedestrian`, `bike`, `combined`, `rail` (+ `barriers: true/false`) |
| `signs` | object (punkt) | `code` (np. B-20), kierunek (`facing`), obszar działania (`affects` → id strefy/pasa) |
| `signals` | object | sygnalizatory: typ S-1/S-2/S-3/S-5/S-6/S-7, faza, grupa |
| `pois` | object | punkty misji: warsztat, kontakty, adresy dostaw |
| `spawns` | object | miejsca startu AI |
| `triggers` | object | wyzwalacze zdarzeń wymuszonych misji |
| `districts` | object | granice dzielnic + `unlock` |
| `road_grades` | object (opcjonalna) | prostokąt odcinka, kierunek spadku `downhill` (N/E/S/W), nachylenie `grade` (np. 0,12) i zasięg widoczności `sight_m` oraz `fog_sight_m` w metrach |
| `collectibles` | object | krasnale, syrenki, ukryte naklejki |

### Graf pasów dla aut (M3a)

- Polilinia wlotowa ma nazwę unikatową w `lanes` oraz pola `type: car`, `intersection`, `side` (`N`, `E`, `S`, `W`), `priorityClass`, `width_px`, `speedLimit` (km/h) i `turns` (np. `straight,left,right`). Punkty są skierowane zgodnie z jazdą, a ostatni punkt to linia zatrzymania na wskazanym boku skrzyżowania.
- Odcinek pomiędzy skrzyżowaniami jest jedną polilinią wlotową. `from` w formacie `<id-skrzyżowania>-<strona>` wskazuje, na którym wylocie poprzedniego skrzyżowania zaczyna się ten pas. Wlot z granicy mapy zaczyna się na jej krawędzi i pomija `from`.
- Odcinek prowadzący poza mapę ma `role: exit`, `intersection`, `side` i `speedLimit`. Zaczyna się na wylocie wskazanego skrzyżowania, kończy na krawędzi mapy. Liczbę aut ustala właściwość całej mapy `trafficCars`. Miasteczko ma 14 aut.
- Dozwolone relacje tworzą krawędzie między linią wlotu a początkiem pasa wylotowego. Ładowanie mapy oraz `npm run build` sprawdzają geometrię i kierunek polilinii, połączenia, listy skrętów, zasięg mapy oraz konfigurację S-1/S-2. `npm run map:generate` odtwarza `maps/miasteczko.tmj`.

---

## Ruch AI w Miasteczku

- `traffic_routes` zawiera kierunkowe polilinie z `kind` i prędkością `speed` w m/s. Pieszy zawraca na końcu chodnika, a tramwaj i pojazd uprzywilejowany ponownie wjeżdżają na granicy mapy z opóźnieniem `repeat_s`. Rowerzysta na jezdni startuje z wlotu wskazanego przez `lane` w obiekcie `roadway_cyclist` warstwy `spawns`.
- `traffic_controls` wiąże wjazd i wyjazd tramwaju lub pojazdu uprzywilejowanego ze skrzyżowaniem przez `route`, indeksy wierzchołków `vertex` i `exit` liczone od zera oraz `lane`. Obiekt przystanku bez wysepki podaje `route`, wierzchołek zatrzymania `vertex`, obszar przejścia przez jezdnię i polilinię `passenger` do chodnika.
- `crossing_signals` przypisuje sygnał do przejścia albo przejazdu przez identyfikator `crossing`. Jeśli zebra i przejazd przylegają do siebie, wspólne `trafficGroup` pozwala zatrzymać pojazdy przed oboma. Fazy sygnałów należy dobrać do ruchu na wlotach i czasu zejścia z przejścia.

## WARSZAWA

**Motywy wizualne:** Wisła przecinająca mapę z północy na południe (Śródmieście/Stare Miasto na zachodzie, Praga/Stadion na wschodzie), czerwone tramwaje, szare i kolorowe bloki, szkło wieżowców w Centrum, zieleń Łazienek.

### 1. Śródmieście — „Pod Pałacem”
- **Landmarki:** Pałac Kultury i Nauki (centralny, najwyższy blok mapy, zegar na wieży, iglica), sylwetki wieżowców obok (szklane bloki o różnej wysokości, w tym bardzo wysoki z iglicą — inspiracja Varso, bez nazwy), rotunda przy skrzyżowaniu, wejście do metra z czerwonym „M”.
- **Układ drogowy:** wielkie skrzyżowanie z sygnalizacją (4 wloty, po 2–3 pasy), tory tramwajowe środkiem, przystanek tramwajowy **bez wysepki** (MSC-02) i z wysepką, sygnalizator z zieloną strzałką S-2, DDR wzdłuż alei z przejazdami dla rowerzystów (P-11, D-6a), sygnalizatory S-6/S-7, boczna jednokierunkowa z kontraruchem (B-2 + T-22).
- **POI:** punkt Szprychy w budce przy metrze, kwiaciarnia, kiosk.
- **Reguły:** SYG-01, SYG-02, ZNAK-S2, PIER-04, PIER-09, MSC-02, GDZIE-01, ZNAK-B2T22.

**Fragment M6a.** Od Zamku na południe prowadzi aleja do czterowlotowego skrzyżowania. Czerwono-żółty tramwaj jedzie wydzielonym torem pomiędzy pasami samochodowymi. Przed skrzyżowaniem pasażer przechodzi przez jezdnię do chodnika przy przystanku bez wysepki. Tramwaj zatrzymuje się także przy wysepce położonej dalej wzdłuż toru. Przejazd P-11 ma osobną fazę S-6 w obu kierunkach, a północny wlot ma S-2. Jadąc od alei w stronę wieżowców można wjechać na kontrapas przy B-2 z T-22. Pałac ma pięć brył, w tym wieżę z zegarami i iglicę. Przy jego skrzydle stoi wejście do metra, po drugiej stronie alei rotunda.

### 2. Stare Miasto — „Starówka”
- **Landmarki:** Zamek Królewski (ceglasto-pomarańczowy, wieża z zegarem), Kolumna Zygmunta na placu, Rynek Starego Miasta z kolorowymi kamienicami i własną figurą syrenki (nasz projekt), Barbakan (ceglane mury, okrągłe baszty).
- **Układ drogowy:** kocie łby (wolniejsza jazda, pasek wstrząsów), strefa zamieszkania (D-40/D-41), deptak — strefa pieszych, wąskie uliczki, dorożki konne (wolne „pojazdy”), mnóstwo turystów.
- **POI:** lodziarnia, przewodnik turystyczny (zleceniodawca), kryjówka z pierwszym podpisem Zakłócacza.
- **Kolekcja:** 10 Syrenek (ukryte miniatury).
- **Reguły:** GDZIE-05, GDZIE-06, GDZIE-07, MAN-08, ZNAK-B1, ZNAK-B9.

**Fragment M4d.** Za mostem ulice prowadzą do zastępczej bryły zamku, Kolumny Zygmunta i rynku z kamienicami. Są tu przejście dla pieszych, wlot z sygnalizacją, strefa zamieszkania D-40/D-41, kocie łby i deptak oznaczony B-9. Na rynku pojawiają się turyści. W WAW-A1-05 wolna jazda po nierównościach i spokojne hamowanie pomagają zdobyć premię za płynność. W WAW-A1-06 Ola kieruje ruchem, a zdjęcie przestawionego znaku prowadzi do podpisu Zakłócacza.

### 3. Powiśle i Bulwary — „Nad Wisłą”
- **Landmarki:** Centrum Nauki Kopernik (ciemna, kanciasta bryła + kopuła planetarium jako srebrna kula), Most Świętokrzyski (jeden ukośny pylon, liny), bulwary z schodkami do wody, park fontann (nocą kolorowe).
- **Układ drogowy:** długa DDR i ciąg pieszo-rowerowy (C-16/C-13 — oba warianty: wspólny i z podziałem), most z wydzieloną DDR, zjazd z bulwaru na jezdnię, ławki i spacerowicze, rowerzyści AI do wyprzedzania.
- **Reguły:** GDZIE-01, GDZIE-02, GDZIE-08, GDZIE-11, MAN-04, MSC-04 (nocna jazda).

**Fragment M6a.** Od przyczółka można zjechać wzdłuż Wisły w stronę Kopernika i planetarium. DDR wzdłuż wody ma ruch rowerowy AI. Na sąsiednim ciągu znaki rozróżniają część wspólną i odcinek rozdzielony na stronę pieszą oraz rowerową. Pas P-23 biegnie przy alei. Po 90 sekundach wolnej jazdy zapada zmrok i włączają się światła latarni oraz fontann. Lampki roweru włącza `L`.

**Most w M4d.** Pylon i wanty oznaczają przeprawę nad Wisłą. DDR oznaczona C-13 biegnie równolegle do jezdni, a przy zamku znajduje się przejazd dla rowerzystów. W WAW-A1-04 wolniejszy rowerzysta na DDR i pieszy przy zebrze tworzą sytuacje do ćwiczeń. Na przyczółku Turbo jedzie pod B-2 bez wyjątku dla rowerów. Obu zawodników ocenia ta sama punktacja.

### 4. Praga — „Po drugiej stronie”
- **Landmarki:** Stadion Narodowy (okrągła misa z fasadą w biało-czerwone pasy „plecione”, maszt pośrodku dachu), praskie kamienice z podwórkami-studniami, neony, bazar z budkami, ceglana fabryka.
- **Układ drogowy:** **skrzyżowania równorzędne** (A-5 lub brak znaków) — główny poligon reguły prawej ręki, droga z pierwszeństwem i podporządkowane (D-1, A-7, B-20), wyjazdy z bram i z drogi wewnętrznej (D-46/D-47), osiedle bloków z parkingiem, próg zwalniający (A-11a), szkoła (A-17), plac zabaw.
- **POI:** warsztat Pana Kazika (warszawski), blok Pani Haliny, kiosk z zapiekankami.
- **Reguły:** PIER-01, PIER-02, PIER-06, MSC-03, ZNAK-STOP, ZNAK-A7, ZNAK-D1, MAN-01, MAN-07.

**Mapa po M6a.** `npm run map:generate:warsaw` odtwarza `maps/warszawa.tmj` wspólnym generatorem Tiled dla Warszawy i Miasteczka. Kolaż wszystkich pięciu dzielnic zajmuje 156 × 112 kafli. Do Śródmieścia prowadzi ulica przy Zamku, a do Powiśla promenada po zachodniej stronie Wisły. Dalej na południe są Łazienki i Mokotów. Polecenie `npm run coverage:maps` odtwarza [raport 13 sytuacji Warszawy](coverage.md).

| Miejsce | Praktyka |
| --- | --- |
| Róg kamienic, osiedle i fabryka | Skrzyżowania równorzędne. W WAW-A1-01 nadjeżdża samochód z prawej. |
| Główna ulica i bazar | Wloty z D-1, A-7 i B-20, zebra, zatoki parkingowe, budki oraz kiosk. W WAW-A1-03 na drodze z pierwszeństwem pojawia się samochód. |
| Warsztat i podwórka | Wyjazdy przez chodnik, w tym droga wewnętrzna z D-46/D-47. W WAW-A1-02 przez wyjazd przechodzi pieszy. |
| Małe rondo | Jednokierunkowy pierścień, cztery wloty A-7 + C-12 i wyspa z kolizją. |
| Osiedle przy szkole | A-17 oraz próg oznaczony A-11a. |

SzprychaApp odblokowuje zadania w kolejności WAW-T-01 → WAW-T-02 → WAW-A1-01 → WAW-A1-02 → WAW-A1-03 → WAW-A1-04 → WAW-A1-05 → WAW-A1-06. Przegląd i próbna jazda odbywają się w Miasteczku. Zlecenia na Pradze używają wymuszonych uczestników ruchu, a wolna jazda uruchamia ruch po całym grafie. W WAW-A1-03 za skrzyżowaniem ze STOP-em jest skrót oznaczony B-1. Jazda rowerem przez pasaż wywołuje werdykt ZNAK-B1.

Pomiar fragmentu w Chromium z ograniczeniem CPU 4× można powtórzyć podczas działania Vite poleceniem `BENCH_MAP=warszawa npm run benchmark:driving`. Wynik zapisuje się w `test-results/performance-praga.json`. Ustaw `BENCH_FRAGMENT=most` lub `BENCH_FRAGMENT=starowka` razem z `BENCH_MAP=warszawa`, żeby zmierzyć jazdę w tych częściach mapy. Fragmenty `srodmiescie`, `powisle` i `mokotow` mierzy się w wolnej jeździe. `BENCH_LIGHT=night` uruchamia nocny wariant, a `BENCH_RUNS=3` zapisuje medianę i zakres trzech prób. Opcja `BENCH_VIEWPORT=640x360` ustawia natywną rozdzielczość gry. Domyślny viewport to 1280 × 720.

### 5. Łazienki i Mokotów — „Park i przedmieścia”
- **Landmarki:** Pałac na Wodzie (biały pałac nad stawem, kolumny), pawie, wiewiórki, pomnik w parku (własny, bez kopiowania pomnika Chopina — „pianista pod wierzbą”, uproszczony), domki jednorodzinne, stacja kolejki podmiejskiej.
- **Układ drogowy:** alejki parkowe z zakazem wjazdu rowerów (B-9) i alejki dozwolone, ciąg pieszo-rowerowy, **przejazd kolejowy z zaporami i bez zapór** (A-9, A-10, G-1, G-3), droga osiedlowa bez chodnika, droga z poboczem.
- **Reguły:** GDZIE-09, GDZIE-04 (pogoda), GDZIE-10, MSC-01, GDZIE-03b, MSC-05.

**Fragment M6a.** Przy stawie stoi Pałac na Wodzie. Aleje prowadzą do pomnika pianisty, ciągu wspólnego i odnogi z B-9. Na osi drogi do stacji są dwa przejazdy. Na północnym migają światła i opuszczają się zapory, na południowym są światła i krzyże św. Andrzeja. Przez oba przejeżdżają pociągi, a auta czekają przed czynną sygnalizacją. Odcinki bez chodnika mają przejezdne pobocza oznaczone w danych pasów.

Zrzuty z wolnej jazdy pokazują [Śródmieście](screenshots/49-srodmiescie.webp), [Powiśle po zmroku](screenshots/49-powisle.webp), [Łazienki i Mokotów](screenshots/49-mokotow.webp) oraz [przejazd kolejowy](screenshots/49-mokotow-kolej.webp).

---

## WROCŁAW

**Motywy wizualne:** Odra i jej odnogi z wieloma mostami (mapa pocięta wodą na wyspy), niebiesko-białe tramwaje, kolorowe kamienice, gotycka czerwona cegła, krasnale wszędzie.

### 1. Rynek i Stare Miasto — „Krasnalowo”
- **Landmarki:** Ratusz (gotycki, ceglany, ostre szczyty, zegar astronomiczny na fasadzie, wieża), kolorowe kamienice dookoła Rynku, plac Solny z kwiaciarniami, kościół z dwiema wieżami połączonymi kładką (inspiracja: Mostek Pokutnic), Uniwersytet nad Odrą (długa barokowa fasada z wieżą).
- **Układ drogowy:** Rynek jako strefa ruchu pieszego (prowadzenie roweru), ogródki kawiarniane, gołębie (zdarzenie losowe), tramwaj okrążający Stare Miasto, przejścia z sygnalizacją S-5 i przejazdy S-7.
- **POI:** punkt startowy z Krasnalem Dzwoneczkiem, kwiaciarnia.
- **Kolekcja:** krasnale (100 w całym mieście, 30 tutaj) — własne projekty, każdy z „zawodem” (krasnal-listonosz, krasnal-strażak, krasnal-rowerzysta).
- **Reguły:** GDZIE-05, GDZIE-06, GDZIE-07, MAN-08, PIER-04.

### 2. Ostrów Tumski i Wyspy — „Wyspa latarni”
- **Landmarki:** Katedra (dwie ceglane wieże z zielonymi, spiczastymi hełmami), Most Tumski (zielony, stalowy, z kłódkami), latarnie gazowe zapalane wieczorem przez Latarnika, Wyspa Słodowa (trawa, młodzież, koncerty).
- **Układ drogowy:** kocie łby, wąskie mosty (ustępowanie, jazda prawą stroną), droga z pierwszeństwem i podporządkowane, strefa zamieszkania.
- **Reguły:** MSC-04, WYP-04/05, PIER-02, MAN-03, ZNAK-A7, ZNAK-D1.

### 3. Hala Stulecia i Zoo — „Wielka kopuła”
- **Landmarki:** Hala Stulecia (okrągła, betonowa, schodkowe pierścienie okien, kopuła), Pergola (półkole kolumnad wokół stawu), Iglica (wysoka, cienka, stalowa), Fontanna Multimedialna (nocą kolorowe strumienie), Zoo z **Afrykarium** (nowoczesny, falisty budynek z dużymi szybami), Ogród Japoński (czerwony mostek).
- **Układ drogowy:** **rondo** (C-12 + A-7) i rondo z sygnalizacją, DDR z przejazdami, ciąg pieszo-rowerowy w parku z tłumem spacerowiczów, parking autokarowy (cofające autokary — ostrożność).
- **Reguły:** PIER-08, GDZIE-01, GDZIE-11, PIER-05, GDZIE-08.

### 4. Południe — „Sky Tower i Dworzec”
- **Landmarki:** Sky Tower (najwyższy blok mapy, smukły, szklany, ze schodkowymi niższymi skrzydłami), Dworzec Główny (długa fasada „jak zamek” z wieżyczkami i blankami, kolor piaskowo-kremowy), wiadukt kolejowy.
- **Układ drogowy:** wielopasowe skrzyżowanie z sygnalizacją i tramwajem, pas ruchu dla rowerów (P-23 + linia), skręt w lewo z „śluzą rowerową” (strefa przed linią zatrzymania), przystanek tramwajowy bez wysepki, zielona strzałka.
- **Reguły:** GDZIE-02, MAN-03, PIER-03, PIER-09, MSC-02, SYG-01, ZNAK-S2.

### 5. Zachód — „Stadion i przedmieścia”
- **Landmarki:** Stadion Wrocław (prostokątna bryła z półprzezroczystą fasadą, która nocą świeci zmieniającymi się kolorami), domki jednorodzinne, pola, las, nasyp obwodnicy z wiaduktem, stacja podmiejska.
- **Układ drogowy:** droga pozamiejska z poboczem (GDZIE-03b), wjazd na obwodnicę/drogę ekspresową — zakaz dla rowerów (znak + bramka fabularna), **przejazd kolejowy** z zaporami i bez, skrzyżowanie z drogą z pierwszeństwem, kryjówka Gangu w starym magazynie.
- **Reguły:** MSC-01, GDZIE-03b, GDZIE-09, PIER-02, MAN-04.

### Bulwary Odry (pas łączący dzielnice 2–5)
Trasa Wielkiego Wyścigu Odrzańskiego: DDR wzdłuż rzeki, kładki, ciąg pieszo-rowerowy, mosty.

### Mapa i kampania po M6d

`npm run map:generate:wroclaw` odtwarza mapę Tiled o wymiarach 176 × 120 kafli. W menu głównym otwórz **Wolna jazda → Wrocław**, aby zacząć przy Rynku. **Kampania → Wrocław** otwiera najbliższe dostępne zlecenie główne. Po 90 sekundach zapada zmrok. Lampki włącza się klawiszem `L`. Aby zebrać krasnala, zejdź z roweru (`X`), podejdź i rozwiąż zagadkę. Licznik zapisuje odkrycia w profilu. W mieście jest 100 znajdziek, w tym 30 na Rynku. [Plik mapy](../maps/wroclaw.tmj)

| Miejsce | Sytuacje w wolnej jeździe |
| --- | --- |
| Rynek i Nadodrze | Deptak, S-5 na zebrze i sygnał rowerowy obok, B-2 z T-22 na uliczce przy bulwarze oraz pętla tramwaju wokół Rynku. |
| Ostrów i Wyspy | Wloty równorzędne, kocie łby, D-40/D-41, zielony most z DDR i kładka na Wyspę Słodową. Latarnie świecą po zmroku. |
| Hala i Zoo | Dwa ronda, w tym jedno z S-1, P-11 przy parku oraz ciąg pieszo-rowerowy. |
| Południe | Aleja z S-2, osobną fazą przejazdu rowerowego, pasem P-23, śluzą rowerową i przystankiem bez wysepki. Niebiesko-kremowy tramwaj zatrzymuje się, a pasażer przechodzi na chodnik. |
| Zachód | D-1 i B-20, wyjazd z drogi wewnętrznej, pobocza, zakaz rowerowy przy zjeździe oraz dwa czynne przejazdy kolejowe, z zaporami i bez. |
| Bulwary Odry | DDR wzdłuż południowego brzegu łączy dzielnice, a AI korzysta z trzech przejazdów rowerowych po drodze. |

Polecenie `npm run coverage:maps` odtwarza raport z wynikiem 13/13. Symulację ruchu można powtórzyć poleceniem `npm test -- tests/sim/wroclaw.test.ts`. Trasa tramwaju wokół Rynku używa właściwości `loop: true` i kończy się w punkcie startowym. Moduł M07 jest ćwiczony w misji „Upadek na bulwarze”. [Raport pokrycia](coverage.md#wrocław) · [Zgłoszenie M6d](https://github.com/wtomaszewski/szprycha/issues/52)

Zrzuty z wolnej jazdy pokazują [Rynek](screenshots/51-rynek.webp), [Ostrów po zmroku](screenshots/51-ostrow.webp), [Halę i rondo](screenshots/51-hala.webp), [Zoo](screenshots/51-zoo.webp), [Dworzec](screenshots/51-poludnie.webp), [Sky Tower](screenshots/51-sky-tower.webp), [Stadion](screenshots/51-zachod.webp) oraz [Bulwary Odry](screenshots/51-bulwary.webp).

Podczas działania Vite uruchom `BENCH_MAP=wroclaw npm run benchmark:driving`. Trasę ustawia `BENCH_FRAGMENT` (`rynek`, `ostrow`, `hala`, `poludnie`, `zachod`, `bulwary`), a `BENCH_LIGHT=night` uruchamia pomiar po zmroku. Wynik trafia do `test-results/performance-wroclaw-*.json`. Parametr `BENCH_RENDERER=canvas` uruchamia pomiar w Canvas.

Pomiary wykonano w Chromium 156 headless, w rozdzielczości 1280 × 720, z ograniczeniem CPU 4× i pełną grafiką.

| Trasa | Renderer | Średnie FPS | p95 klatki |
| --- | --- | ---: | ---: |
| Rynek w dzień | WebGL | 59,10 | 16,8 ms |
| Ostrów po zmroku | WebGL | 58,91 | 16,8 ms |
| Ostrów po zmroku | Canvas | 59,82 | 16,7 ms |

---

## KRAKÓW

Wybierz **Kampania → Kraków**, aby otrzymać najbliższe nieukończone zlecenie główne. **Wolna jazda → Kraków** zaczyna się przy Rynku. Kolaż ma 152 × 112 kafli. Trzy przeprawy łączą brzegi Wisły, a główne połączenia drogowe pozostają dostępne od początku. Generator `npm run map:generate:krakow` odtwarza [krakow.tmj](../maps/krakow.tmj).

| Dzielnica | Miejsce i praktyka | Dostęp |
| --- | --- | --- |
| Rynek i Planty | Sukiennice, asymetryczne wieże kościoła Mariackiego, strefa piesza z B-9. Po zmroku zapnij kask i włącz lampki, a przed deptakiem zejdź z roweru. | Od startu |
| Wawel | Zamek z dziedzińcem i basztą, złota kopuła oraz autorska rzeźba Smoka pod murem oporowym. | Po „Wieczornym spacerze po Rynku” |
| Kazimierz | Kamienice, mały targ, dom modlitwy, uliczka jednokierunkowa z B-2 i wyjątkiem dla rowerów oraz oznaczonym kontrapasem. | Po „Wieczornym spacerze po Rynku” |
| Bulwary Wisły | Czerwona DDR z przejazdami przez drogi przy mostach, oddzielny ciąg wspólny C-13/C-16, schody i ławki. Na ciągu wspólnym piesi mają pierwszeństwo. | Po ćwiczeniu „Kontrapas na Kazimierzu” |
| Kopiec i park | Zielona sylwetka Kopca z krętą ścieżką i strefą B-9. | Po ćwiczeniu „Pomoc na bulwarach” |

SzprychaApp udostępnia kolejne zlecenia po ukończeniu poprzednich. Szkolenie obejmuje trzy ćwiczenia z mapy #105. Zachowane identyfikatory `KRA-B-01`–`KRA-B-03` pozwalają wczytać wcześniejsze ukończenia i odblokowania dzielnic. Po szkoleniu jest 15 zleceń głównych w trzech aktach. Ukończenie kampanii dodaje Kraków do miast dostępnych w egzaminie po spełnieniu wymagań Licencji Szprychy. [Fabuła](02_fabula.md#kraków--błyskawica-nad-wisłą) · [Lista misji](03_misje.md#kampania--kraków)

Na mapie leży siedem drewnianych obwarzanków. Zsiądź z roweru, podejdź i rozwiąż zagadkę. Zdobycz zapisuje się w profilu. Cztery misje mają oznaczone skróty przez przejścia z B-1 na Rynku, Kazimierzu i pod Kopcem. Jazda skrótem nalicza karę za zakaz i odbiera premię czasową. W pobliżu każdego przejścia można pojechać legalną trasą.

W Wolnej jeździe auta korzystają z połączonego grafu dróg i zatrzymują się przy zielonej fazie dla pieszych i rowerzystów. Piesi chodzą po placach, ciągu wspólnym i przejściu z sygnalizacją. Rowerzysta przejeżdża wzdłuż Wisły. Srebrno-grafitowy tramwaj zatrzymuje się przy przystanku bez wysepki i przepuszcza wysiadającego pasażera. Na zachodzie działają zapory przejazdu kolejowego. Zmrok zapada po 90 sekundach.

`npm run coverage:maps -- --strict` wykrywa 13/13 sytuacji i 7/7 modułów M01–M07. `npm test -- tests/sim/krakow.test.ts` sprawdza komplet sytuacji, szkolenie i dziesięć minut symulacji dla każdego z trzech ziaren. `npm test -- tests/missions/krakow-campaign.test.ts` sprawdza legalny przejazd przez każdy etap główny, wynik czterech skrótów i trasę egzaminu. [Raport pokrycia](coverage.md#kraków)

Pomiar po dodaniu kampanii wykonano kolejno na tym samym komputerze w Chromium 156.0.8078.79 headless. Obie próby używały Wolnej jazdy, WebGL, pełnej grafiki, rozdzielczości 640 × 360 i ograniczenia CPU 4×.

| Odcinek | Średnie FPS | p95 klatki |
| --- | ---: | ---: |
| Kraków, Rynek | 58,64 | 16,8 ms |
| Warszawa, Starówka | 60,00 | 16,7 ms |

Przy uruchomionym Vite użyj `BENCH_VIEWPORT=640x360 BENCH_MAP=krakow npm run benchmark:driving`. Pomiar Warszawy odtwarza `BENCH_VIEWPORT=640x360 BENCH_MAP=warszawa BENCH_FRAGMENT=starowka BENCH_MODE=free npm run benchmark:driving`.

Zrzuty kampanii pokazują [wybór Krakowa](screenshots/106-kampania.webp), [obwarzanki przy Sukiennicach](screenshots/106-obwarzanki.webp) i [zagadkę pierwszej znajdźki](screenshots/106-zagadka.webp).

Zrzuty Wolnej jazdy pokazują [wybór miasta](screenshots/105-mapa-polski.webp), [Rynek](screenshots/105-rynek.webp), [Wawel i Smoka](screenshots/105-wawel.webp), [Kazimierz](screenshots/105-kazimierz.webp), [bulwary](screenshots/105-bulwary.webp), [Kopiec](screenshots/105-kopiec.webp) i [tramwaj](screenshots/105-tramwaj.webp).

## GDAŃSK

**Kampania → Gdańsk** otwiera najbliższe nieukończone zlecenie. **Wolna jazda → Gdańsk** zaczyna się przy Długim Targu. Kolaż w skali mikro ma 152 × 112 kafli. Przez Motławę prowadzą przeprawy drogowe i dwie kładki. Generator `npm run map:generate:gdansk` odtwarza [gdansk.tmj](../maps/gdansk.tmj).

| Dzielnica | Miejsce i praktyka | Dostęp |
| --- | --- | --- |
| Długi Targ | Kostka, szereg kamienic, autorska fontanna, dojście przez strefę zamieszkania. | Od startu |
| Żuraw | Ceglane wieże obejmują ciemną drewnianą bryłę wysuniętą ku Motławie. Znak B-9 przy drewnianej kładce zabrania jazdy. Rower można przeprowadzić. | Od startu |
| Ołowianka | Spichlerz za kładką, czerwona DDR z przejazdami, dalej skrzyżowanie równorzędne i tory towarowe. | Po `GDA-B-01` |
| Promenada w Brzeźnie | Wspólny ciąg C-13/C-16, na którym piesi mają pierwszeństwo. Wydmy oddzielają go od zapiaszczonej drogi dojazdowej. | Po `GDA-B-01` |
| Plaża | Pas piasku i pianka przy brzegu zatoki. Od północy dochodzi droga, na której trzeba dostosować prędkość do zapiaszczenia. | Po `GDA-B-03` |
| Stocznia | Hale, kratownicowe dźwigi, kontrapas z wyjątkiem pod B-2 i stalowa kładka ze wspólną drogą. | Po `GDA-B-04` |

Ćwiczenia uruchamia się w SzprychaApp. W `GDA-B-01` gracz zapina kask, włącza lampki i prowadzi rower przez kładkę. `GDA-B-02` sprawdza zachowanie wobec pieszych i bezpieczną reakcję na upadek. W `GDA-B-03` silny wiatr nawiewa piasek na drogę. Reguła MAN-08 ocenia prędkość na podstawie drogi zatrzymania, a wjazd w skrót z B-1 kończy próbę bez premii czasowej. `GDA-B-04` obejmuje przejazd zgodnie z S-6 i sprawdzenie, czy jest wolny.

Auta korzystają z połączonego grafu dróg. Rowerzysta jedzie wzdłuż Motławy, a piesi chodzą po nabrzeżu, Długim Targu i promenadzie. Srebrno-grafitowy tramwaj obsługuje przystanek bez wysepki. W Wolnej jeździe zmrok zapada po 90 sekundach.

Kampania zachowuje identyfikatory szkoleń `GDA-B-01`–`GDA-B-04` i dotychczasowe odblokowania. Po szkoleniu SzprychaApp udostępnia dziewięć misji w trzech aktach. Spośród sześciu gdańskich bursztynów trzy prowadzą trop przez Długi Targ. Pozostałe można zebrać w Wolnej jeździe przy Żurawiu, na promenadzie i w stoczni. Po ukończeniu kampanii można wybrać Gdańsk na przejazd kontrolny po spełnieniu wymagań Licencji Szprychy. [Fabuła](02_fabula.md#gdańsk--trzy-błyski-nad-motławą) · [Lista misji](03_misje.md#kampania--gdańsk)

`npm run coverage:maps -- --strict` sprawdza w CI 13/13 sytuacji oraz 7/7 modułów M01–M07. `npm test -- tests/sim/gdansk.test.ts tests/missions/gdansk-campaign.test.ts` sprawdza dziesięć minut ruchu dla każdego z trzech ziaren, szkolenia, przejazdy w kampanii i egzaminie oraz punktację trzech nielegalnych skrótów. [Raport pokrycia](coverage.md#gdańsk)

Pomiar kampanii #126 na tym samym komputerze w Chromium 156.0.8078.79 headless używał Wolnej jazdy, WebGL, pełnej grafiki, rozdzielczości 640 × 360 i ograniczenia CPU 4×. Dla Długiego Targu i Starówki podano mediany dwóch prób, a dla plaży wynik jednej próby.

| Odcinek | Średnie FPS | p95 klatki |
| --- | ---: | ---: |
| Gdańsk, Długi Targ | 59,78 | 16,75 ms |
| Gdańsk, plaża | 59,91 | 16,80 ms |
| Warszawa, Starówka | 59,73 | 16,75 ms |

Przy uruchomionym Vite pomiar odtwarza `BENCH_VIEWPORT=640x360 BENCH_MAP=gdansk BENCH_RUNS=2 npm run benchmark:driving`. Dla plaży ustaw `BENCH_FRAGMENT=plaza` i `BENCH_RUNS=1`. Warszawę odtwarza `BENCH_VIEWPORT=640x360 BENCH_MAP=warszawa BENCH_FRAGMENT=starowka BENCH_MODE=free BENCH_RUNS=2 npm run benchmark:driving`.

Zrzuty pokazują [wybór miasta](screenshots/125-mapa-polski.webp), [Długi Targ](screenshots/125-dlugi-targ.webp), [Żuraw](screenshots/125-zuraw.webp), [kładkę](screenshots/125-kladka.webp), [stocznię](screenshots/125-stocznia.webp), [promenadę](screenshots/125-promenada.webp), [plażę](screenshots/125-plaza.webp) i [tramwaj](screenshots/125-tramwaj.webp).

Zrzuty kampanii pokazują [wybór Gdańska](screenshots/126-kampania.webp), [bursztyn na Długim Targu](screenshots/126-bursztyny.webp) i [pierwszą zagadkę](screenshots/126-zagadka.webp).

## Wieś i las

Wybierz **Wolna jazda → Wieś i las**, aby zacząć na poboczu drogi gminnej. Po 85 sekundach zapada zmrok. Ćwiczenia są w SzprychaApp. PWA pobiera mapę przy pierwszej wizycie, po której można ją otworzyć offline. Kolaż ma 128 × 96 kafli. Polecenie `npm run map:generate:wies` odtwarza mapę z danych generatora. [Mapa Tiled](../maps/wies.tmj)

| Odcinek | Sytuacje |
| --- | --- |
| Droga gminna | Jezdnia bez chodnika i linii. Na północy utwardzone pobocza, które rowerzysta wykorzystuje, gdy są przejezdne. Po końcu pobocza jedzie przy prawej krawędzi jezdni. Piesi idą po lewej stronie. Auta zachowują co najmniej metr bocznego odstępu przy wyprzedzaniu. |
| Przystanek i pole | Szary autobus regionalny zatrzymuje się przy wiacie. Ciągnik jeździ drogą gruntową przy polu. |
| Tory i mostek | Jednotorowy przejazd bez zapór i świateł z A-10 i G-3 z obu stron. Pociąg okresowo przecina drogę. Drewniany mostek prowadzi nad strumieniem. |
| Osada i las | Gospodarstwo z wyjazdem z drogi wewnętrznej, skrzyżowania równorzędne i ze STOP-em na podporządkowanej, małe rondo, strefa zamieszkania, leśny ciąg wspólny i ścieżka z B-9. |
| Przy skansenie | Tramwaj i przystanek bez wysepki, sygnalizacja S-1 i S-2, DDR z przejazdem i S-6. |

**Ćwiczenia.** WIE-B-01 obejmuje pobocze i odstęp przy wyprzedzaniu. WIE-B-02 zalicza przejazd po zatrzymaniu się przed torami i sprawdzeniu, czy są wolne. W tym ćwiczeniu na drodze wyłączono pozostały ruch, a pociąg kursuje według rozkładu mapy. WIE-B-03 wymaga kasku i świateł po zmroku. Kamizelka jest zalecana podczas jazdy, a pieszy na poboczu poza obszarem zabudowanym po zmroku używa widocznego odblasku. WIE-B-04 ćwiczy wyjazd z gospodarstwa i wybór bezpiecznego miejsca do udzielenia pomocy. Wjazd w skrót z B-1 kończy próbę bez premii czasowej.

**Kampania → Wieś i las** otwiera najbliższe nieukończone zlecenie. Ukończenia szkoleń z Wolnej jazdy liczą się w kampanii. Trzy szyszki z zagadkami leżą na dziedzińcu szkoły, a czwarta przy skansenie. Podejdź do nich, prowadząc rower. Po finale można wybrać wieś na przejazd kontrolny po spełnieniu wymagań Licencji Szprychy. [Fabuła](02_fabula.md#wieś-i-las--mapa-bez-skrótów) · [Lista misji](03_misje.md#kampania--wieś-i-las)

`npm run coverage:maps -- --strict` sprawdza w CI 13/13 sytuacji i 7/7 modułów M01–M07. `npm test -- tests/sim/wies.test.ts tests/missions/wies-campaign.test.ts` obejmuje przejście ćwiczeń, kampanii i przejazdu kontrolnego, zakazany skrót, odstęp przy wyprzedzaniu i trzy próby po dziesięć minut ruchu. `npm run test:e2e -- tests/e2e/wies.spec.ts` sprawdza także wybór kampanii, zapis znajdźki, wyposażenie po zmroku i scenkę pierwszej pomocy. [Raport pokrycia](coverage.md#wieś-i-las)

Pomiar po dodaniu kampanii (#128) wykonano kolejno na tej samej maszynie w Chromium 156.0.8078.79 headless, w Wolnej jeździe, z WebGL, pełną grafiką, rozdzielczością 640 × 360 i ograniczeniem CPU 4×.

| Odcinek | Średnie FPS | p95 klatki |
| --- | ---: | ---: |
| Wieś i las, droga gminna | 58,73 | 16,8 ms |
| Warszawa, Starówka | 57,37 | 16,8 ms |

Przy uruchomionym Vite pomiar odtwarza `BENCH_VIEWPORT=640x360 BENCH_MAP=wies npm run benchmark:driving`. Dla Warszawy ustaw `BENCH_MAP=warszawa BENCH_FRAGMENT=starowka BENCH_MODE=free`.

Zrzuty pokazują [wybór mapy](screenshots/127-mapa-polski.webp), [drogę gminną](screenshots/127-gminna.webp), [przystanek](screenshots/127-przystanek.webp), [przejazd kolejowy](screenshots/127-kolej.webp), [mostek](screenshots/127-mostek.webp), [ciągnik przy polu](screenshots/127-ciagnik.webp), [gospodarstwo](screenshots/127-gospodarstwo.webp) i [jazdę po zmroku](screenshots/127-noc.webp).

Zrzuty kampanii pokazują [wybór kampanii](screenshots/128-kampania.webp), [szyszki przy szkole](screenshots/128-szyszki.webp), [przygotowanie do jazdy o zmroku](screenshots/128-kamizelka.webp) i [pierwszą pomoc przy polu](screenshots/128-pierwsza-pomoc.webp).

## POZNAŃ

**Wolna jazda → Poznań** rozpoczyna się na Starym Rynku. Kolaż zajmuje 152 × 112 kafli. Wszystkie dzielnice można odwiedzić od pierwszej jazdy. PWA pobiera miasto przy pierwszej wizycie i przechowuje je do jazdy offline. Generator `npm run map:generate:poznan` odtwarza [poznan.tmj](../maps/poznan.tmj).

| Miejsce | Układ i praktyka |
| --- | --- |
| Stary Rynek | Ratusz z zegarem i koziołkami, kolorowe domki budnicze, oznakowana strefa zamieszkania D-40/D-41 i pasaż z B-1. |
| Aleja tramwajowa | Śluza przed S-1 z dwiema liniami zatrzymania, osobny przejazd z S-6 i przystanek na wysepce. Na wysepkę prowadzi zebra z chodnika. Dalej działa przystanek bez wysepki. |
| Dawny browar | Ceglany dziedziniec, komin, ulica z kontrapasem i wyjazd z drogi wewnętrznej. |
| Bulwar Warty i Ostrów Tumski | Nabrzeże z ławkami i wspólną drogą C-13/C-16, czerwony most na Ostrów, katedra z dwiema wieżami i nadrzeczna DDR z przejazdami przez jezdnię. |
| Kolejowa i Ogrody | Przejazd kolejowy z zaporami, przejezdne pobocze, skrzyżowania równorzędne i rondo przy ogrodach. |

Na mapie jeżdżą auta, rowerzysta i srebrno-grafitowy tramwaj. Piesi chodzą po rynku, nabrzeżu i zebrze na peron. Piesi na zebrze do wysepki korzystają z pierwszeństwa wobec rowerzysty zgodnie z art. 26 ust. 1 PoRD. Osobny przystanek bez wysepki uruchamia regułę MSC-02. [Prawo o ruchu drogowym](https://eli.gov.pl/eli/DU/2024/1251/ogl)

Zegar Ratusza zaczyna od 11:00 i po 12 sekundach symulacji wskazuje południe. Pokaz trwa trzy sekundy. W Wolnej jeździe po 90 sekundach zapada zmrok.

| Ćwiczenie w SzprychaApp | Przejezdna trasa |
| --- | --- |
| `POZ-B-01` | Zapnij kask, ustąp pieszym na rynku i objedź pasaż oznaczony B-1. Wjazd w zakaz kończy próbę bez premii czasowej. |
| `POZ-B-02` | Wjedź pasem do śluzy, poczekaj na sygnał zezwalający i po przejechaniu skrzyżowania trzymaj się prawej strony jezdni. |
| `POZ-B-03` | Zatrzymaj się przed zebrą i przejedź, gdy piesza idąca na peron zwolni twój pas. |
| `POZ-B-04` | Włącz lampki, zasygnalizuj zamiar skrętu i jedź wspólną drogą przez most. Przy katedrze wybierz bezpieczną kolejność udzielania pomocy. |

**Kampania → Poznań** wznawia najbliższą nieukończoną misję. Po czterech szkoleniach odblokowuje się sześć misji głównych w trzech aktach. Trzy drewniane rogale z zagadkami leżą na rynku, a czwarty na bulwarze. Podejdź do znajdziek, prowadząc rower. Po finale można wybrać Poznań na przejazd kontrolny przez śluzę po spełnieniu wymagań Licencji Szprychy. [Fabuła](02_fabula.md#poznań--trzy-znaki-na-drewnie) · [Misje](03_misje.md#kampania--poznań)

`npm run coverage:maps -- --strict` sprawdza w CI 13/13 sytuacji i 7/7 modułów M01–M07. `npm test -- tests/sim/poznan.test.ts tests/missions/poznan-campaign.test.ts` sprawdza cztery szkolenia, sześć misji głównych, przejazd kontrolny, dwa niedozwolone skróty, czerwone światło w śluzie i dziesięć minut ruchu na każdym z trzech ziaren. `npm run test:e2e -- tests/e2e/poznan.spec.ts` sprawdza wybór miasta, wznawianie kampanii, zapisywanie rogala po zagadce, scenkę pierwszej pomocy i renderowanie miejsc. [Raport pokrycia](coverage.md#poznań)

Pomiary dla #138 wykonano kolejno na tej samej maszynie na buildzie produkcyjnym. Chromium 156.0.8078.79 działał w trybie headless z WebGL, pełną grafiką, widokiem 640 × 360 i ograniczeniem CPU 4×. Tabela podaje mediany dwóch prób w Wolnej jeździe.

| Odcinek | Średnie FPS | p95 klatki |
| --- | ---: | ---: |
| Poznań, Stary Rynek | 45,68 | 33,4 ms |
| Warszawa, Starówka | 43,09 | 33,4 ms |

Po `npm run build && npm run preview` uruchom `BENCH_URL=http://127.0.0.1:4173/ BENCH_VIEWPORT=640x360 BENCH_MAP=poznan BENCH_RUNS=2 npm run benchmark:driving`. Dla Warszawy ustaw `BENCH_MAP=warszawa BENCH_FRAGMENT=starowka BENCH_MODE=free`.

Zrzuty z gry pokazują [wybór miasta](screenshots/137-mapa-polski.webp), [Stary Rynek przed południem](screenshots/137-przed-poludniem.webp), [pokaz koziołków](screenshots/137-rynek.webp), [Ostrów Tumski](screenshots/137-ostrow.webp), [dawny browar](screenshots/137-browar.webp), [bulwar Warty](screenshots/137-bulwar.webp), [tramwaj na przystanku](screenshots/137-tramwaj.webp) i [śluzę rowerową](screenshots/137-sluza.webp).

Zrzuty kampanii pokazują [wybór Poznania](screenshots/138-kampania.webp), [drewniane rogale na rynku](screenshots/138-rogale.webp), [pierwszą zagadkę](screenshots/138-zagadka.webp) i [scenkę pierwszej pomocy](screenshots/138-pierwsza-pomoc.webp).

## ZAKOPANE

**Wolna jazda → Zakopane** zaczyna się na drodze pieszo-rowerowej obok Krupówek. Kolaż zajmuje 152 × 112 kafli. PWA pobiera mapę przy pierwszej wizycie i udostępnia ją później offline. `npm run map:generate:zakopane` odtwarza [zakopane.tmj](../maps/zakopane.tmj).

| Miejsce | Układ i praktyka |
| --- | --- |
| Krupówki | Brukowany deptak z B-1, drewniane wille, ławki i stojak na rowery. Po południowej stronie biegnie droga pieszo-rowerowa. Nad zabudową widać grań Giewontu. |
| Potok | Dwa drewniane mostki łączą drogi pieszo-rowerowe na przeciwnych brzegach. Do północnego brzegu prowadzą DDR i oznakowany przejazd. |
| Zjazd spod regli | Dwukierunkowa jezdnia z odcinkiem o nachyleniu 12%. Jadąc w dół, rower może przyspieszać po puszczeniu pedałów i potrzebuje więcej miejsca do zatrzymania. Podjazd jest wolniejszy. |
| Droga pod reglami | Przejezdne pobocza po obu stronach drogi poza obszarem zabudowanym, przejazd kolejowy z zaporami oraz skrzyżowanie równorzędne. |
| Okolice dworca | Skrzyżowanie z sygnalizacją, DDR z sygnałem S-6, plac z kontrapasem i fikcyjny tramwaj szkoleniowy z przystankiem bez wysepki. |

Mapa zawiera także rondo, skrzyżowanie z drogą z pierwszeństwem i STOP-em oraz wyjazd z drogi wewnętrznej. W Wolnej jeździe po 90 sekundach zapada zmrok.

| Ćwiczenie w SzprychaApp | Zadanie |
| --- | --- |
| `ZAK-B-01` | Kontroluj prędkość na zjeździe, zatrzymaj się przy znaczniku i dokończ odcinek. |
| `ZAK-B-02` | Wybierz prawe przejezdne pobocze i zatrzymaj się na nim. |
| `ZAK-B-03` | Zapnij kask, włącz obie lampki i dostosuj prędkość do krótszego zasięgu widoczności. Zatrzymaj się przy znaczniku. |
| `ZAK-B-04` | Rozpoznaj B-1 na deptaku i przejedź sąsiednią drogą pieszo-rowerową. |
| `ZAK-B-05` | Oceń sytuację przed przejazdem, przejedź przez mostek i wybierz bezpieczny pierwszy krok przy udzielaniu pomocy. |

Wynik ćwiczeń zależy od ukończenia zadań i bezpiecznej jazdy. Wjazd na deptak podczas `ZAK-B-04` kończy próbę. Reguły `MAN-08`, `GDZIE-03b` i `MSC-04` odwołują się do danych przepisów. Szacowana droga zatrzymania uwzględnia czas reakcji, kierunek względem spadku i przyczepność. Na zjeździe i we mgle silnik porównuje ją z zasięgiem widoczności zapisanym dla odcinka. [Przepisy gry](../content/przepisy.yaml)

`npm run coverage:maps -- --strict` obejmuje 13/13 sytuacji i 7/7 modułów M01–M07. `npm test -- tests/sim/zakopane.test.ts` sprawdza przejazdy, niedozwolony skrót, deterministyczność nachylenia, hamowanie i trzy próby po dziesięć minut ruchu AI. [Raport pokrycia](coverage.md#zakopane)

Zrzuty z Chromium pokazują [mapę Polski](screenshots/141-mapa-polski.webp), [Krupówki i Giewont](screenshots/141-krupowki.webp), [mostki](screenshots/141-mostki.webp), [pobocze](screenshots/141-pobocze.webp) i [zjazd we mgle](screenshots/141-mgla.webp).

## Miasteczko Ruchu Drogowego (wspólny hub, osobna mała mapa 80×60)
Wzorowane na prawdziwych szkolnych miasteczkach ruchu: małe skrzyżowania każdego typu, mini-rondo, sygnalizacja, przejazd kolejowy z zaporami, znaki z Albumu na tablicach, **plac manewrowy** (ósemka, slalom, tor wąski, pole zatrzymania). Tu: samouczek, plac, quiz w budynku szkoły, egzamin Licencji.

## Tabela pokrycia (każde miasto musi mieć ✓ w każdym wierszu)
| Sytuacja | Warszawa | Wrocław | Kraków | Gdańsk | Wieś i las | Poznań | Zakopane |
|---|---|---|---| --- | --- | --- | --- |
| Skrzyżowanie równorzędne | Praga | Ostrów / Zachód | Dębniki i Ogrody | Ołowianka i Brzeźno | Skrzyżowanie pod lasem | Kolejowa i Ogrody | Pod Reglami i U Podnóża |
| Droga z pierwszeństwem + STOP | Praga | Zachód | Skrzyżowanie przy targu | Skrzyżowanie przy Długim Targu | Droga gminna przy osadzie | Skrzyżowanie przy rynku | Skrzyżowanie pod Krupówkami |
| Sygnalizacja + S-2 + S-6/S-7 | Śródmieście | Południe | Aleja tramwajowa | Aleja tramwajowa | Skansen | Aleja tramwajowa | Przy dworcu |
| Rondo | Praga (małe) / Miasteczko | Hala Stulecia | Rondo przy parku | Rondo przy stoczni | Rondo przy lesie | Rondo przy ogrodach | Rondo przy zjeździe |
| Tramwaj + przystanek bez wysepki | Śródmieście | Południe | Aleja tramwajowa | Aleja tramwajowa | Tramwaj przy skansenie | Aleja tramwajowa | Przystanek przy dworcu |
| DDR, pas rowerowy, ciąg pieszo-rowerowy | Powiśle | Południe / Hala Stulecia | Bulwary i Kazimierz | DDR nad Motławą, kontrapas w stoczni i promenada | Zagrody i las | Bulwar Warty, śluza i kontrapas przy browarze | DDR przy dworcu i nad potokiem, kontrapas, mostki |
| Przejazd dla rowerzystów | Śródmieście / Powiśle | Hala Stulecia | Aleja i bulwary | Aleja i przeprawy przez Motławę | Skansen | Aleja i bulwary | Przy dworcu i nad potokiem |
| Strefa zamieszkania / pieszych | Stare Miasto | Rynek / Ostrów | Rynek i Kazimierz | Dojście do Długiego Targu | Plac osady | Stary Rynek i Ostrów Tumski | Krupówki |
| Wyjazd z drogi wewnętrznej | Praga | Zachód | Podwórze przy targu | Wyjazd z placu magazynowego | Gospodarstwo | Dziedziniec dawnego browaru | Wyjazd z parkingu |
| Przejazd kolejowy | Mokotów | Zachód | Dębniki | Tory towarowe na południowym zachodzie | Droga gminna | Kolejowa | Pod Reglami |
| Pobocze, zakaz wjazdu rowerów | Mokotów / Łazienki | Zachód | Dębniki i Kopiec | Pobocze przy torach i kładka przy Żurawiu | Północ drogi gminnej i rezerwat | Kolejowa i alejka przy katedrze | Droga pod reglami i alejka leśna |
| Kontraruch | Śródmieście | Rynek (Nadodrze) | Kazimierz | Stocznia | Uliczka osady | Uliczka przy dawnym browarze | Uliczka przy parkingu |
| Nocna jazda | Bulwary | Ostrów Tumski | Rynek i bulwary | Kładka przy Żurawiu | Ćwiczenie WIE-B-03 | Bulwar Warty i most Tumski | Zmrok w Wolnej jeździe |

## Kolejne mapy (po MVP, kolejność wg popularności)
Łódź (Piotrkowska, Manufaktura).
