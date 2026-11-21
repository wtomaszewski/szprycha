# 05 — Mapy: Warszawa i Wrocław (skala mikro)

## Zasady ogólne
- **Nie odwzorowujemy układu ulic.** Każde miasto to **kolaż 5 dzielnic** zbudowany wokół charakterystycznych miejsc, połączonych drogami, mostami i torami tramwajowymi. Gracz ma poczuć „to Warszawa!”, a nie nawigować wg Google Maps.
- **Skala:** kafel 32×32 px ≈ 1,5 m. Jezdnia 2 pasy = 4–5 kafli, chodnik 2 kafle, DDR 1–2 kafle. Landmarki są **przeskalowane w dół** (PKiN ~10×10 kafli podstawy, nie 100×100) — skala symboliczna, jak w makiecie.
- **Rozmiar mapy miasta:** ok. 200×150 kafli (6400×4800 px), jedna mapa Tiled na miasto, podział na dzielnice warstwą obiektów `districts`. Dzielnice odblokowywane fabularnie (zablokowane = szlaban/„roboty drogowe” z humorem).
- **Każde miasto musi zawierać komplet sytuacji drogowych** potrzebnych do modułów M01–M07 (tabela pokrycia na końcu). Raport `tools/coverage-report.ts` sprawdza to automatycznie z warstw obiektów.
- **Wybór mapy:** scena `CityPicker` — pixel-artowa mapa Polski z pinezkami. Warszawa i Wrocław dostępne od startu; reszta jako „wkrótce” (sylwetki).

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
| `collectibles` | object | krasnale, syrenki, ukryte naklejki |

### Graf pasów dla aut (M3a)

- Polilinia wlotowa ma nazwę unikatową w `lanes` oraz pola `type: car`, `intersection`, `side` (`N`, `E`, `S`, `W`), `priorityClass`, `width_px`, `speedLimit` (km/h) i `turns` (np. `straight,left,right`). Punkty są skierowane zgodnie z jazdą, a ostatni punkt to linia zatrzymania na wskazanym boku skrzyżowania.
- Odcinek pomiędzy skrzyżowaniami jest jedną polilinią wlotową. `from` w formacie `<id-skrzyżowania>-<strona>` wskazuje, na którym wylocie poprzedniego skrzyżowania zaczyna się ten pas. Wlot z granicy mapy zaczyna się na jej krawędzi i pomija `from`.
- Odcinek prowadzący poza mapę ma `role: exit`, `intersection`, `side` i `speedLimit`. Zaczyna się na wylocie wskazanego skrzyżowania, kończy na krawędzi mapy. Liczbę aut ustala właściwość całej mapy `trafficCars`. Miasteczko ma 14 aut.
- Dozwolone relacje tworzą krawędzie między linią wlotu a początkiem pasa wylotowego. Ładowanie mapy oraz `npm run build` sprawdzają geometrię i kierunek polilinii, połączenia, listy skrętów, zasięg mapy oraz konfigurację S-1/S-2. `npm run map:generate` odtwarza `maps/miasteczko.tmj`.

---

## WARSZAWA

**Motywy wizualne:** Wisła przecinająca mapę z północy na południe (Śródmieście/Stare Miasto na zachodzie, Praga/Stadion na wschodzie), czerwone tramwaje, szare i kolorowe bloki, szkło wieżowców w Centrum, zieleń Łazienek.

### 1. Śródmieście — „Pod Pałacem”
- **Landmarki:** Pałac Kultury i Nauki (centralny, najwyższy blok mapy, zegar na wieży, iglica), sylwetki wieżowców obok (szklane bloki o różnej wysokości, w tym bardzo wysoki z iglicą — inspiracja Varso, bez nazwy), rotunda przy skrzyżowaniu, wejście do metra z czerwonym „M”.
- **Układ drogowy:** wielkie skrzyżowanie z sygnalizacją (4 wloty, po 2–3 pasy), tory tramwajowe środkiem, przystanek tramwajowy **bez wysepki** (MSC-02) i z wysepką, sygnalizator z zieloną strzałką S-2, DDR wzdłuż alei z przejazdami dla rowerzystów (P-11, D-6a), sygnalizatory S-6/S-7, boczna jednokierunkowa z kontraruchem (B-2 + T-22).
- **POI:** punkt Szprychy w budce przy metrze, kwiaciarnia, kiosk.
- **Reguły:** SYG-01, SYG-02, ZNAK-S2, PIER-04, PIER-09, MSC-02, GDZIE-01, ZNAK-B2T22.

### 2. Stare Miasto — „Starówka”
- **Landmarki:** Zamek Królewski (ceglasto-pomarańczowy, wieża z zegarem), Kolumna Zygmunta na placu, Rynek Starego Miasta z kolorowymi kamienicami i własną figurą syrenki (nasz projekt), Barbakan (ceglane mury, okrągłe baszty).
- **Układ drogowy:** kocie łby (wolniejsza jazda, pasek wstrząsów), strefa zamieszkania (D-40/D-41), deptak — strefa pieszych, wąskie uliczki, dorożki konne (wolne „pojazdy”), mnóstwo turystów.
- **POI:** lodziarnia, przewodnik turystyczny (zleceniodawca), kryjówka z pierwszym podpisem Zakłócacza.
- **Kolekcja:** 10 Syrenek (ukryte miniatury).
- **Reguły:** GDZIE-05, GDZIE-06, GDZIE-07, MAN-08, ZNAK-B1, ZNAK-B9.

### 3. Powiśle i Bulwary — „Nad Wisłą”
- **Landmarki:** Centrum Nauki Kopernik (ciemna, kanciasta bryła + kopuła planetarium jako srebrna kula), Most Świętokrzyski (jeden ukośny pylon, liny), bulwary z schodkami do wody, park fontann (nocą kolorowe).
- **Układ drogowy:** długa DDR i ciąg pieszo-rowerowy (C-16/C-13 — oba warianty: wspólny i z podziałem), most z wydzieloną DDR, zjazd z bulwaru na jezdnię, ławki i spacerowicze, rowerzyści AI do wyprzedzania.
- **Reguły:** GDZIE-01, GDZIE-02, GDZIE-08, GDZIE-11, MAN-04, MSC-04 (nocne misje).

### 4. Praga — „Po drugiej stronie”
- **Landmarki:** Stadion Narodowy (okrągła misa z fasadą w biało-czerwone pasy „plecione”, maszt pośrodku dachu), praskie kamienice z podwórkami-studniami, neony, bazar z budkami, ceglana fabryka.
- **Układ drogowy:** **skrzyżowania równorzędne** (A-5 lub brak znaków) — główny poligon reguły prawej ręki, droga z pierwszeństwem i podporządkowane (D-1, A-7, B-20), wyjazdy z bram i z drogi wewnętrznej (D-46/D-47), osiedle bloków z parkingiem, próg zwalniający (A-11a), szkoła (A-17), plac zabaw.
- **POI:** warsztat Pana Kazika (warszawski), blok Pani Haliny, kiosk z zapiekankami.
- **Reguły:** PIER-01, PIER-02, PIER-06, MSC-03, ZNAK-STOP, ZNAK-A7, ZNAK-D1, MAN-01, MAN-07.

### 5. Łazienki i Mokotów — „Park i przedmieścia”
- **Landmarki:** Pałac na Wodzie (biały pałac nad stawem, kolumny), pawie, wiewiórki, pomnik w parku (własny, bez kopiowania pomnika Chopina — „pianista pod wierzbą”, uproszczony), domki jednorodzinne, stacja kolejki podmiejskiej.
- **Układ drogowy:** alejki parkowe z zakazem wjazdu rowerów (B-9) i alejki dozwolone, ciąg pieszo-rowerowy, **przejazd kolejowy z zaporami i bez zapór** (A-9, A-10, G-1, G-3), droga osiedlowa bez chodnika, droga z poboczem.
- **Reguły:** GDZIE-09, GDZIE-04 (pogoda), GDZIE-10, MSC-01, GDZIE-03b, MSC-05.

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

---

## Miasteczko Ruchu Drogowego (wspólny hub, osobna mała mapa 80×60)
Wzorowane na prawdziwych szkolnych miasteczkach ruchu: małe skrzyżowania każdego typu, mini-rondo, sygnalizacja, przejazd kolejowy z zaporami, znaki z Albumu na tablicach, **plac manewrowy** (ósemka, slalom, tor wąski, pole zatrzymania). Tu: samouczek, plac, quiz w budynku szkoły, egzamin Licencji.

## Tabela pokrycia (każde miasto musi mieć ✓ w każdym wierszu)
| Sytuacja | Warszawa | Wrocław |
|---|---|---|
| Skrzyżowanie równorzędne | Praga | Ostrów / Zachód |
| Droga z pierwszeństwem + STOP | Praga | Zachód |
| Sygnalizacja + S-2 + S-6/S-7 | Śródmieście | Południe |
| Rondo | Praga (małe) / Miasteczko | Hala Stulecia |
| Tramwaj + przystanek bez wysepki | Śródmieście | Południe |
| DDR, pas rowerowy, ciąg pieszo-rowerowy | Powiśle | Południe / Hala Stulecia |
| Przejazd dla rowerzystów | Śródmieście / Powiśle | Hala Stulecia |
| Strefa zamieszkania / pieszych | Stare Miasto | Rynek / Ostrów |
| Wyjazd z drogi wewnętrznej | Praga | Zachód |
| Przejazd kolejowy | Mokotów | Zachód |
| Pobocze, zakaz wjazdu rowerów | Mokotów / Łazienki | Zachód |
| Kontraruch | Śródmieście | Rynek (Nadodrze) |
| Nocna jazda | Bulwary | Ostrów Tumski |

## Kolejne mapy (po MVP, kolejność wg popularności)
Kraków (Wawel, Smok, Sukiennice, Kopiec, bulwary Wisły) · Gdańsk (Żuraw, Długi Targ, stocznia, plaża) · Poznań (Ratusz z koziołkami, Stary Browar) · Łódź (Piotrkowska, Manufaktura) · **Wieś i las** (droga gminna, PKS, przejazd niestrzeżony, pole, las, ciągnik — szczególnie ważne dla dzieci spoza dużych miast) · Zakopane (Krupówki, Giewont w tle).
