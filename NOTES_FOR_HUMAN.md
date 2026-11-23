# Notatki dla człowieka

## Wydanie sklepowe 1/2

- Właściciel potwierdza dostęp do kont Google Play Console i Apple Developer / App Store Connect, dane wydawcy i identyfikatory aplikacji.
- Wydawca przygotowuje podpisane paczki Android i iOS, przechowuje klucze poza repozytorium oraz wypełnia Families, Kids Category, IARC, Data safety i App Privacy dla wariantu offline bez rankingów. [Checklista wydania](docs/BUILD_STORE.md)
- Konsultant potwierdza stan prawny przyjęty w treściach (21 listopada 2026 r.). Po weryfikacji należy uaktualnić zgodnie daty w `content/przepisy.yaml`, `content/pytania.json` i `docs/zrodla_i_stan_prawny.md`, a następnie uzupełnić `recenzja_merytoryczna` w `content/o-grze.yaml` za zgodą konsultanta.

## M10a — Strefa Rodzica

- Przed wydaniem uzupełnić dane administratora i kontaktu, daty oraz osobę i zakres recenzji. Przekazać szablony z `legal/` prawnikowi i wybrać wariant odpowiadający wydaniu. Ustawić zatwierdzone adresy polityki prywatności i strony projektu w konfiguracji wydania.
- Sprawdzić bramkę na urządzeniach przed zgłoszeniem do Apple Kids Category i Google Play Families. Oświadczenia o prywatności i bezpieczeństwie danych wypełnić zgodnie z działaniem publikowanej wersji i jej hostingu.
- Wiek dobiera wskazówki z KASK-01 i GDZIE-10 w Mapie Umiejętności. Wariant 16+ pokazuje poradę o dopasowaniu i zapięciu kasku. Scenariusze nadal określają rolę i warunki jazdy bohatera. Brzmienie i zakres GDZIE-10 wymagają potwierdzenia konsultanta.
- Certyfikat używa nicku z generatora. Pole opcjonalnego imienia z M7c usunięto zgodnie z wymaganiem M10a dotyczącym wolnego tekstu.
- Przed udostępnieniem rankingów M10c potwierdzić z prawnikiem podstawę przetwarzania, okres przechowywania danych i treść informacji dla rodzica. Operatora, region hostingu i przebieg usuwania z kopii ustalić zgodnie z sekcją M10b.
- Przed wydaniem rankingów w natywnym APK podjąć decyzję o uprawnieniu `android.permission.INTERNET` i zaktualizować deklaracje sklepowe. Układ M10c sprawdzono w web/PWA na emulowanym telefonie i tablecie.

## Podsumowanie M8

- **M8a.** Radio, efekty i fanfara powstają w Web Audio. Lektor wybiera lokalny polski głos. Na urządzeniach bez takiego głosu wynik i wskazówka nadal są dostępne jako tekst.
- **M8b.** W misjach pogoda wpływa na hamowanie oraz warunki oceny GDZIE-04 i GDZIE-05. Nocne kursy pokazują światło lampki i odblaski. Brzmienie porady WYP-06 pozostaje do konsultacji, jak opisano niżej.
- **M8c.** Pierwszeństwo w wyborze momentu chwały mają ustąpienie innym uczestnikom i wyraźne zatrzymanie. Kolejność reguł jest stała, a przy powtórzeniu tej samej reguły wygrywa wcześniejszy bezpieczny fragment. System odrzuca fragmenty powiązane z wykrytym błędem, hamowaniem ochronnym, kolizją lub powrotem do punktu kontrolnego. Jeśli brak bezpiecznego kadru, ekran pokazuje podsumowanie tekstowe.
- Opanowanie reguł pokazuje stan po misji i faktyczną różnicę względem startu. Uwzględnia dzienne limity i skutki błędów. Premia czasowa widnieje w rozbiciu punktów zgodnie z `docs/04`. Kryteria momentu chwały opierają się na potwierdzonych dobrych nawykach.

## Notatki z M0

Stan: 21.11.2026. Przeczytano AGENTS.md, dokumenty w kolejności §1, wszystkie moduły dydaktyczne i pięć plików content (także balans.yaml). Pliki paczki pozostały niezmienione. To analiza dokumentacji projektu, nie recenzja prawna ani medyczna.

## a) Projekt w 10 punktach

1. SZPRYCHA to edukacyjna gra akcji dla dzieci 9–12 lat, przygotowująca do karty rowerowej przez decyzje podczas jazdy.
2. Gracz jest młodym kurierem: odbiera zlecenia, przygotowuje rower, dostarcza przesyłki i rozwija umiejętności.
3. Warszawa i Wrocław mają po pięć dzielnic; są kolażami charakterystycznych miejsc, a nie odwzorowaniem ulic. Wspólny hub to Miasteczko Ruchu Drogowego.
4. Kampanie obejmują zagadkę Zakłócacza i zaginionych krasnali, po trzy akty oraz misje poboczne. Turbo zmienia się dzięki doświadczeniom; Ola jest mentorką.
5. Bezpieczna jazda musi zawsze wygrywać punktowo ze skrótem naruszającym zasady. Punkty, combo, gwiazdki, żetony i mastery mają wspierać naukę.
6. Dydaktyka M01–M08 i przepisy.yaml są nadrzędne wobec fabuły. Paczka zawiera 68 reguł, 53 znaki, 54 pytania i 20 osiągnięć.
7. Silnik zasad ma być deterministycznym, czystym TypeScriptem. Semantyka Tiled jest oddzielona od obrazu; werdykty z ruleId trafiają do systemów gry.
8. Oprawa to pixel-art 640×360, kafel 32 px, budynki 2.5D z paralaksą względem kamery, lokalny font z polskimi znakami i czytelne sygnalizowanie ręką.
9. Błędy prowadzą do stop-klatki, krótkiej rady i powtórki, bez przemocy i upokorzenia. Quiz, plac i egzamin uzupełniają naukę przez działanie; certyfikat gry nie zastępuje karty.
10. Gra ma działać offline, bez reklam, analityki i danych osobowych dziecka. PWA/mobile należą do M9, a dobrowolne rankingi online i panel klasy do M10.

## b) Niejasności, sprzeczności i przyjęte decyzje

- **Kolejność pierwszego commitu:** AGENTS §1 każe przeczytać wszystko przed pierwszym commitem, ale polecenie użytkownika wymaga commitu dokumentacji przed krokiem 2. Zastosowano kolejność użytkownika; wszystkie materiały przeczytano przed implementacją.
- **Opiekun Franka:** dydaktyka M02 i Q011 pozwalają graczowi opiekować się siedmiolatkiem, podczas gdy GDZIE-10 mówi o dorosłym opiekunie, a bohater jest dzieckiem. Przed M4 potrzebne doprecyzowanie: bezpieczna propozycja to towarzyszący dorosły NPC; M0 nie rozstrzyga tego mechaniką.
- **Dostęp do Licencji:** zgodnie z decyzją #7 wymagane są łącznie ukończona kampania jednego miasta, ranga Mistrz Szlaku i mastery ≥70 każdego modułu. Licencja jest przyznawana po zdaniu egzaminu.
- **Długość tekstów:** komentarz w przepisy.yaml deklaruje ≤160 znaków dla_dziecka, ale GDZIE-04 ma 261, GDZIE-08 166, PIER-08 170, MAN-12 203, MSC-01 197. Nie skrócono merytoryki. Schemat wymaga niepustego opisu, bez limitu 160; limit feedback ≤140 jest egzekwowany. Długie opisy są materiałem do późniejszego albumu, nie gotowymi dymkami misji.
- **Jedno zdanie vs dialog:** AGENTS §2 wymaga jednego zdania w trakcie misji; docs/02 dopuszcza kilka dymków, a docs/04 wyjaśnienie 1–2 zdań. W przyszłości stosować jedno krótkie zdanie podczas akcji, rozwinięcie poza jazdą.
- **Skrót może się opłacać przy obecnych liczbach:** kara minor 150 jest mniejsza niż maksymalny bonus czasu 500. Sam balans nie gwarantuje nadrzędnej zasady. M5 musi testować każdą trasę i zysk czasu, zanim misja zostanie dopuszczona.
- **Opcjonalne odblaski (M8b):** WYP-06 ma `waga_bledu: null` i daje jednorazowy bonus za kamizelkę podczas jazdy po ciemku z włączonymi lampkami. Do konsultacji pozostaje brzmienie porady o dodatkowych odblaskach (flaga `weryfikacja: true`). Czerwony tylny odblask WYP-03 jest zamontowany na rowerze gracza.
- **Wagi i nakładające się reguły:** docs/07 dopuszcza minor przy TTC <2 s, choć PIER-* domyślnie mają major. GDZIE-09 i ZNAK-B9 mają różne wagi dla zakazu; MSC-03/PIER-06 i WYP-04/05/MSC-04 mogą podwójnie punktować jedno zdarzenie. Potrzebna tabela priorytetów i deduplikacja przed M2.
- **Zakres detektorów:** Raport pokrycia pokazuje osobne detektory i geometrię ćwiczeń `plac`. Dane rozróżniają również typy `garaz`, `scenka` i `quiz-only`.
- **Pierwsza pomoc a przedstawienie zdarzeń:** AGENTS zabrania karetki z poszkodowanym dzieckiem, M07 opisuje odjazd na kontrolę. Przed M4/M7 ustalić neutralne zakończenie bez pokazywania transportu. PP-04 i scenariusze wymagają recenzji ratownika, bez dorabiania zaleceń w kodzie.
- **Wiek:** docs/09 przewiduje przedziały, docs/07 liczbowy RiderState.age. Propozycja: lokalny przedział i wyprowadzane uprawnienia, bez zbierania daty urodzenia. Uzgodnić granice „do 10 lat” / „poniżej 10” z konsultantem.
- **Materiały nie są dowodem aktualności prawa:** stan_prawny i weryfikacja:false pochodzą z paczki. M0 weryfikuje strukturę, nie potwierdza prawdziwości przepisów. KASK-01, daty reform i całość banku także wymagają końcowej recenzji wskazanej w docs/zrodla_i_stan_prawny.md.
- **Obrazek Q024:** B-2+T-22 jest kompozycją dwóch znaków, nie pojedynczym kodem albumu. Przyszły loader ilustracji powinien rozpoznawać kompozycje; M0 nie ładuje ilustracji quizu.
- **Zakres CI:** Android/iOS z ogólnego stosu dopiero w M9. M0 ma CI web: instalacja, lint, format, vitest, build i smoke Playwright. Repozytorium GitHub zostało podłączone; CI dla M0 przeszło na Ubuntu / Node 24 (run 44895919210).

## c) Reguły weryfikacja: true — lista do konsultanta

Poniżej pełna lista 20 pozycji z content/przepisy.yaml. Nie zmieniano flag. Prosimy o potwierdzenie brzmienia, wyjątków, zakresu i źródła każdej reguły przed wydaniem.

- **WYP-06** (M01) — Dodatkowe odblaski (zalecane).
- **GDZIE-03b** (M02) — Pobocze przed jezdnią.
- **GDZIE-08** (M02) — Jazda obok innego rowerzysty.
- **GDZIE-10** (M02) — Młodsze dziecko na rowerze.
- **GDZIE-11** (M02) — Wspólna droga dla pieszych i rowerów.
- **SYG-02** (M03) — Sygnalizator dla rowerzystów.
- **ZNAK-P23** (M03) — Rower namalowany na jezdni.
- **PIER-04** (M04) — Skręcasz? Przepuść pieszych i rowerzystów.
- **PIER-05** (M04) — Przejazd dla rowerzystów.
- **PIER-09** (M04) — Tramwaj.
- **MAN-05** (M05) — Wyprzedzanie wolnych pojazdów z prawej.
- **MAN-12** (M05) — Gdzie nie wyprzedzamy.
- **MSC-05** (M06) — Jazda w kolumnie.
- **PP-04** (M07) — Pozycja bezpieczna i drobne rany.
- **PLAC-01** (M08) — Ósemka.
- **PLAC-02** (M08) — Slalom.
- **PLAC-03** (M08) — Wąski tor.
- **PLAC-04** (M08) — Zatrzymanie w wyznaczonym miejscu.
- **PLAC-05** (M08) — Ruszanie z sygnalizacją.
- **PLAC-06** (M08) — Jazda z jedną ręką (sygnalizowanie skrętu).

## d) Ryzyka techniczne i plan ograniczenia

- **Renderer 2.5D (M1):** wzór w docs/06 używa pozycji dachu do obliczenia przesunięcia samego dachu; trzeba jawnie ustalić punkt odniesienia podstawy, zwrot widocznych ścian i wysokość warstw. Zaplanować małą scenę testową z kilkoma wysokościami, ruch kamery przez środek i krawędzie, porównanie sylwetek i screeny referencyjne. Kolizje liczyć po podstawach, niezależnie od dachu. Sortować ściany/dachy stabilnie, testować zasłanianie roweru i wielowarstwowe landmarki. Culling musi uwzględniać wysunięty dach. Zaokrąglać końcową projekcję do logicznych pikseli, aby ograniczyć drganie.
- **Wydajność 2.5D (M1):** profilować na ograniczonym CPU i prawdziwym Androidzie; wspólne tekstury, buforowana geometria, aktualizacja tylko widocznych bloków, zero nowych obiektów na klatkę. Tryb blocks:lite dopiero po pomiarze. Nie ma jeszcze renderera ani benchmarku 60 FPS — to M1.
- **Silnik zasad (M2):** stały krok 1/60 s, zegar symulacji zamiast Date.now, kontrolowany seed, brak importów Phasera. Najpierw kontrakty WorldModel/AgentState/Verdict, potem detektory. Testy: poprawnie, minor/major tam gdzie możliwe, wyjątek i granica; powtórzenie identycznego logu musi dawać identyczne werdykty.
- **Geometria i pierwszeństwo:** prekomputować konflikty pasów, identyfikować przejście przez linię zamiast samej obecności w strefie; używać histerezy i identyfikatora epizodu, aby nie karać co tick. Osobne testy STOP, świateł, skrętów, pieszego, tramwaju i nakładania się reguł. Hamowanie ochronne AI nie może ukrywać wymuszenia — zachować dowody sprzed hamowania.
- **Dane i ewolucja (zrobione w M0):** zod strict dla wszystkich pięciu dokumentów; nieznane pola, brakujące dane, duplikaty i nieistniejące ruleId przerywają build. Rekurencyjna kontrola all w osiągnięciach. JSON powstaje tylko po walidacji; przeglądarka ponownie waliduje dane przed MainMenu. Schema changes są świadomą zmianą kodu, treść istniejących pól pozostaje edytowalna bez kodowania.
- **Font i start (zrobione w M0):** lokalny OFL, test faktycznych obrysów glifów małych/wielkich liter, Boot czeka na font, Preload na treść. Błąd fontu/HTTP/danych daje komunikat zamiast pustego menu. Smoke przeglądarki sprawdza dojście do menu i zapisuje screenshot.
- **Skalowanie:** M0 używa całkowitego powiększenia 640×360. Przy mniejszym oknie może pojawić się przewijanie. Rozszerzanie do 640×480 na 4:3 i docelowy mobilny układ zostają do M1/M9; nie deklarujemy kompletnej responsywności w szkielecie.
- **Rozmiar pakietu:** Phaser jest wydzielony do osobnego fragmentu bundla; ostrzeżenie Vite o dużym pliku silnika jest znane. Optymalizacja zasobów i ładowanie miast dopiero po pojawieniu się świata.

## Uruchamianie i decyzje M0

Node 24 (plik .nvmrc), npm ci, następnie npm run dev. Testy: npm test, npm run lint, npm run format:check, npm run build. Smoke: npx playwright install chromium oraz npm run test:e2e. Walidacja samych treści: npm run validate:content. Wygenerowane public/data/ jest ignorowane przez Git i odtwarzane przez Vite zarówno w dev, jak i podczas builda.

Phaser 3.90.0 to najwyższa stabilna wersja 3.x zwrócona przez rejestr npm podczas implementacji. Użyto cyklu scen opisanego w [dokumentacji Phasera](https://docs.phaser.io/phaser/concepts/scenes) i konfiguracji [Vite](https://vite.dev/guide/). Nie wdrożono PWA, profili, jazdy, map, quizu ani silnika zasad. Kampania jest oznaczona jako w przygotowaniu.

## Aktualizacja po decyzji użytkownika — M1

Użytkownik potwierdził działanie M0 i polecił rozwijać mechanikę. Grafika M0 jest nieczytelna i nie odpowiada oczekiwanemu klimatowi GTA2; traktujemy ją jako odrzucony kierunek docelowy. Na razie rozwijamy funkcjonalny prototyp. Interfejs jazdy używa systemowego sans-serif dla czytelności, a Pixelify Sans pozostaje w menu z testem polskich glifów. To świadome odstępstwo od jednolitego fontu pikselowego na podstawie uwagi użytkownika.

M1 dodaje osobną scenę jazdy i dane testowej mapy. Nie przenosi fabuły ani prawa do kodu. Brak werdyktów, punktów i misji jest celowy: są przedmiotem M2–M5. Mapa ma puste warstwy przyszłych pasów, znaków i skrzyżowań, które trzeba uzupełnić przed pracą nad silnikiem zasad.

Model jazdy używa px/s, a przelicznik 1,5 m/32 px służy wyświetlaniu prędkości. Wsiadanie/zsiadanie tylko przy niemal zerowej prędkości. Krawężnik można przekroczyć podczas prowadzenia, ścian nie. Klasyczne sterowanie umożliwia powolne obrócenie się na postoju, żeby rower nie zakleszczał się przy ścianie. Nie są to nowe reguły prawne.

W rendererze usunięto niejednoznaczność wzoru: przesunięcie dachu liczymy od środka podstawy względem środka kamery, z mnożnikiem 0,015 × liczba pięter. Aktualny zakres to prostokąty, płaski dach, geometryczne pasy pięter i uproszczony cień. Brak jeszcze tekstur ścian, poligonów i wielowarstwowych landmarków; mapa testowa ich nie wymaga. Nie oceniamy tego jako finalnej grafiki.

Wydajność: pomiar 4× CPU w Chromium dał średnio 60,00 FPS i p95 16,8 ms. Test na fizycznym średnim Androidzie i fizycznym gamepadzie pozostaje do wykonania; Gamepad API przetestowano automatycznie przez symulację przycisków i osi. Pełna responsywność tabletów i telefonów nadal wymaga pracy. M1 jest grywalnym prototypem, nie finalnym wydaniem.

### Korekta skali po obejrzeniu M1

Na prośbę użytkownika zmniejszono skalę świata do 75% (zoom kamery 0,75). Widać około 33% więcej terenu w każdym wymiarze. Rower ma skalę sprite'a 2×, więc po oddaleniu jest na ekranie o 50% większy niż wcześniej. To celowe, umowne proporcje dla czytelności. Fizyka i rozmiar kolizji pozostają takie same. Culling budynków uwzględnia rozszerzony widok. Użytkownik zaakceptował odejście od realistycznych proporcji; zoom 0,75 jest również świadomym odstępstwem od zasady wyłącznie całkowitego skalowania w pierwotnej dokumentacji.

## Decyzje po przeglądzie M0/M1

Niniejszy wpis zastępuje wcześniejsze decyzje o zoomie 0,75, systemowej czcionce HUD i blokowaniu roweru na krawężniku.

1. Zachowujemy bazę 640×360 i wybieramy największy całkowity mnożnik mieszczący tę bazę w oknie. Dodatkowe piksele rozszerzają widok świata w obu osiach. Na małych ekranach poniżej bazy viewport zmniejsza się przy ×1. Kamera nie stosuje już ułamkowego zoomu; powiększenie roweru ×2 zostaje.
2. Na telefonie w pionie symulacja czeka na obrót. Mobilny HUD jest DOM-em w lokalnym foncie pikselowym i palecie docs/06; pole gry nie jest formularzem. Test mierzy łączną powierzchnię panelu i sterowania na 844×390, limit 21% (około 20%). Testy emulują urządzenie, nie zastępują kontroli fizycznego telefonu.
3. Stan akcji przy rowerze jest fundamentem dla M2, bez oceniania: lewa/prawa ręka, obejrzenie się, dzwonek, światła. Ręka i pozostałe oznaczenia są grafiką zastępczą; dzwonek na razie ma tylko wizualny impuls. Docelowe animacje/sound design pozostają otwarte.
4. Krawężnik to opór, nie ściana: przy jeździe limit 40 px/s podczas kontaktu; chodnik dostępny. Przejazd przez przerwy-obniżenia płynny. To parametr zręcznościowy, nie interpretacja prawna dopuszczająca jazdę po chodniku. W M2 GDZIE-04 będzie korzystać z semantyki stref.
5. Strojenie projekcji: k=0,03 zamiast 0,015. Testowy pałac na wschód od startu ma warstwy 4/10/18/26/32 i piaskowcową kolorystykę. Nie jest finalnym modelem PKiN (brak docelowych zegarów, attyk i tekstur). Pozostaje do oceny wizualnej; wielowarstwowe ściany są nadal uproszczonymi ekstruzjami.
6. Sprawdzone automatycznie: klawisz W przez 1 sekundę, event target=window, przyciski akcji, krawężnik kontra obniżenie i ściana, cztery proporcje/rozmiary ekranu, pion/poziom, warstwy wieży. Oryginalne dokumenty i dane przepisów bez zmian.

### Ponowne oddalenie widoku

Na kolejną prośbę użytkownika kamera miasta ma zoom 0,75: widoczny obszar jest o około 33% szerszy i wyższy. Całkowite skalowanie canvasa i rozszerzanie viewportu pozostają; zoom kamery jest świadomym wyjątkiem od całkowitej skali świata. HUD zachowuje rozmiar.

## M2 — decyzje i zakres do recenzji

Rekomendacje 1–8 są przyjęte. Poniższy wpis aktualizuje wcześniejsze pytania projektowe i zachowuje terminy wdrożenia uzgodnione w [#7](https://github.com/wtomaszewski/szprycha/issues/7).

1. M5 przyznaje bonus czasu tylko przy zerze naruszeń obu wag. Test punktacji ma objąć opłacalność oznaczonych skrótów.
2. W eskortach Franka obowiązek opiekuna pełni dorosły NPC, a gracz prowadzi grupę. Silnik M2 wymaga jawnej roli dorosłego i dziecka poniżej 10 lat przy wyjątku chodnikowym. Misje i dostosowanie Q011 należą do M4/M7.
3. Licencja w M7 wymaga łącznie ukończenia kampanii jednego miasta, rangi Mistrz Szlaku i mastery ≥70 każdego modułu.
4. Wynik placu w M7 jest sumą punktów ułamkowych za elementy, np. 0 / 0,5 / 1. Próg 90% i parametry trafiają do balansu wraz z weryfikacją wymagań egzaminu.
5. W scenkach M4/M7 poszkodowany siedzi, opiekun lub ratownik podchodzi, mówi „Wszystko będzie dobrze”, po czym obraz gaśnie.
6. Profil w M4 zbiera lokalnie przedział wieku (<10 / 10–15 / 16+). Silnik używa przedziałów już w M2. Prototyp jazdy ma domyślny przedział 10–15 i zapięty kask, a zmianę wyposażenia sprawdzają scenariusze.
7. Dymki reguł w trakcie jazdy mają jedno zdanie do 140 znaków. Scenariusze kontrolują treści wszystkich emitowanych naruszeń. Dłuższe `dla_dziecka` należą do Albumu i Notatnika Kuriera.
8. Kamera zachowuje zoom 0,75. W krótkiej próbie w Chromium przy ok. 6 km/h krawędzie pozostawały czytelne podczas ruchu. RenderTexture pozostaje rozwiązaniem do ponownej oceny, jeśli migotanie będzie widoczne na urządzeniu docelowym.

W symulacji M2 TTC liczymy wzdłuż prekomputowanych tras wlotów, a konflikt oceniamy przy przekroczeniu linii wlotu. Skręty w macierzy to odcinki między wlotem a wyjazdem. Skrypty aut i pieszych służą do ćwiczeń. Pełne ścieżki i zarządzanie ruchem, polecenia osoby kierującej ruchem i detektory konfliktów z pieszymi podczas skrętu należą do kolejnych etapów. Overlay pokazuje aktualną fazę sygnalizacji i najbliższy konflikt. Wyniki opanowania reguł pojawią się w M5.

KASK-01 zgłasza wyłącznie poważne naruszenie obowiązku. GDZIE-01, GDZIE-04 i MAN-01 mają wagę drobną. PIER-01/02 i STOP stosują progi konfliktu z docs/07. WYP-06 jest pozycją bonusową z `waga_bledu: null`; jej flaga `weryfikacja: true` pozostaje. Punkt 9 zgłoszenia #7 i lista reguł do konsultacji z §c są otwarte.

## M3a — wydajność ruchu AI

Pomiar WebGL w Chromium przy spowolnieniu CPU 4× dał 51,66 FPS dla M3a i 35,44 FPS dla `main` w tym samym środowisku. Cel 60 FPS dla M3a pozostaje do potwierdzenia przez Wojtka na sprzęcie docelowym z podglądem Cloudflare Pages.

## M3c — do konsultacji

- GDZIE-03b korzysta z poboczy opisanych przez autora mapy, a GDZIE-08 opiera dymek na zaobserwowanym hamowaniu ochronnym. Prośba o sprawdzenie warunków przejezdności pobocza i zakresu utrudniania ruchu w parach.
- W ćwiczeniach GDZIE-11 należy sprawdzić granicę między wspólną drogą a częściami wydzielonymi. W SYG-02 należy potwierdzić zakres sytuacji, w których zastosowanie ma sygnalizator z symbolem roweru.
- W MAN-05 dymek skupia się na odstępie i obserwacji pojazdu, a w MAN-12 na zakazie wyprzedzania w określonych miejscach i omijania auta przepuszczającego pieszych. Prośba o sprawdzenie wyjątków na kierowanych przejściach i skrzyżowaniach oraz zakresu przepisu przy wyprzedzaniu z prawej.
- GDZIE-10 ma tryb `quiz-only`. W misji eskortowej należy jawnie określić, kto jest dorosłym opiekunem Franka i jakie zachowanie ma oceniać gra (zgłoszenie #7, punkty 2 i 9).

### Teksty feedbacku z PR #20 i #21

Poniżej zestawienie zmian do przejrzenia przez konsultanta merytorycznego (pierwsze 17 wierszy z PR #20, kolejne 13 z PR #21).

| Reguła     | Stary tekst                                                                                             | Nowy tekst                                                                                                                                 | Powód                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| WYP-04     | Robi się ciemno — światła! Masz widzieć drogę, a inni mają widzieć Ciebie.                              | Gdy robi się ciemno, włącz przednią lampkę, żeby oświetlić drogę.                                                                          | Wskazuje przednią lampkę i jej rolę w oświetlaniu drogi.                                |
| WYP-05     | Tył też musi świecić na czerwono. Auto jadące za Tobą musi Cię zobaczyć z daleka.                       | Gdy słabo widać, włącz tylną czerwoną lampkę, żeby kierowcy widzieli Cię z daleka.                                                         | Wskazuje tylną czerwoną lampkę i warunki słabej widoczności.                            |
| PIER-03    | Skręcając w lewo, przepuść tych z naprzeciwka. Oni jadą prosto — mają pierwszeństwo.                    | Przed skrętem w lewo przepuść jadących z naprzeciwka prosto i skręcających w prawo.                                                        | Uwzględnia także skręcających w prawo z naprzeciwka.                                    |
| PIER-04    | Skręcając, przecinasz drogę pieszym. Oni mają pierwszeństwo — poczekaj chwilę.                          | Przy skręcie uważaj na pieszych i rowerzystów przecinających Twój tor jazdy.                                                               | Wskazuje pieszych i rowerzystów na torze jazdy, zgodnie z zakresem konsultacji.         |
| PIER-05    | Przejazd dla rowerów to nie trampolina! Upewnij się, że kierowca Cię widzi i zdąży stanąć.              | Przed wjazdem na przejazd zwolnij i sprawdź, czy zbliża się samochód.                                                                      | Podaje konkretne zachowanie przed wjazdem na przejazd.                                  |
| PIER-06    | Wyjeżdżasz z bramy? To Ty przepuszczasz wszystkich — i pieszych na chodniku też.                        | Gdy włączasz się do ruchu, przepuść pojazdy i pieszych przecinających Twój tor.                                                            | Obejmuje włączanie się do ruchu także poza wyjazdem z bramy.                            |
| PIER-07    | Karetka jedzie do kogoś, kto potrzebuje pomocy. Zjedź na prawo i zrób jej miejsce.                      | Zjedź bezpiecznie na prawo i zostaw miejsce dla pojazdu z syreną i niebieskimi światłami.                                                  | Obejmuje pojazdy rozpoznawane po syrenie i niebieskich światłach.                       |
| PIER-08    | Ten, kto jest na rondzie, ma pierwszeństwo (gdy stoi znak ustąp). Poczekaj na lukę.                     | Przy znaku ustąp pierwszeństwa poczekaj na wolne miejsce na rondzie.                                                                       | Wprost uzależnia wskazówkę od znaku ustąpienia pierwszeństwa.                           |
| PIER-09    | Tramwaj nie skręci i nie zahamuje jak auto. Na takim skrzyżowaniu ma pierwszeństwo.                     | Gdy tory przecinają Twój tor jazdy, zwolnij i obserwuj tramwaj, znaki oraz światła.                                                        | Kieruje uwagę na tramwaj, znaki i światła, zgodnie z zakresem konsultacji.              |
| MAN-06     | Drzwi auta potrafią otworzyć się w sekundę. Trzymaj metr odstępu.                                       | Zostaw ponad metr odstępu od zaparkowanego auta na wypadek otwarcia drzwi.                                                                 | Dopasowuje wskazówkę do odstępu wykrywanego przy zaparkowanym aucie.                    |
| MAN-07     | Ruszając, zawsze obejrzyj się przez lewe ramię. Z tyłu mogło coś jechać.                                | Przed ruszeniem obejrzyj się przez lewe ramię, bo z tyłu może nadjeżdżać pojazd.                                                           | Wskazuje, kiedy wykonać spojrzenie przez ramię.                                         |
| MAN-09     | Bez trzymanki to w cyrku. Na drodze przynajmniej jedna ręka zawsze na kierownicy.                       | Podczas jazdy trzymaj co najmniej jedną rękę na kierownicy, a nogi na pedałach.                                                            | Obejmuje również trzymanie nóg na pedałach.                                             |
| MAN-10     | Rower jest jednoosobowy. Kolega idzie pieszo albo jedzie swoim rowerem.                                 | Jednoosobowym rowerem jedź sam, a kolega może iść pieszo albo jechać swoim.                                                                | Odnosi wskazówkę do roweru jednoosobowego.                                              |
| MAN-11     | SMS może poczekać. Zatrzymaj się bezpiecznie, wtedy odbierz.                                            | Zatrzymaj się w bezpiecznym miejscu, zanim sięgniesz po telefon.                                                                           | Obejmuje sięganie po telefon niezależnie od zastosowania.                               |
| MSC-01     | Pociąg nie zahamuje dla nikogo. Gdy miga czerwone — stoisz, bez dyskusji.                               | Gdy migają czerwone światła, dzwoni sygnał lub zapory się ruszają, stój przed torami, a przez tory przejedź bez zatrzymywania.             | Wskazuje, kiedy stać przed torami i jak przejechać przez przejazd.                      |
| MSC-02     | Ludzie wysiadają z tramwaju prosto na jezdnię. Stań i poczekaj, aż przejdą.                             | Przed przystankiem bez wysepki stań i poczekaj, aż pasażerowie zejdą z jezdni.                                                             | Wskazuje miejsce zatrzymania i kiedy można ruszyć.                                      |
| MSC-04     | Kierowca widzi ubranie bez odblasku z kilkudziesięciu metrów. Z odblaskiem — z dużo dalszej odległości. | Gdy robi się ciemno lub słabo widać, włącz obie lampki.                                                                                    | Wskazuje obie lampki i warunki oświetlenia sprawdzane przez detektor.                   |
| GDZIE-02   | Widzisz rower namalowany na jezdni? To pas dla Ciebie — jedź nim, zgodnie z kierunkiem ruchu.           | Jedź po pasie rowerowym zgodnie z wyznaczonym kierunkiem.                                                                                  | Jedno zdanie wskazuje wyznaczony kierunek ruchu na pasie.                               |
| GDZIE-03b  | Poza miastem jest pobocze? Jedź nim — dalej od pędzących aut.                                           | Skorzystaj z pobocza, jeśli jest przejezdne i możesz jechać nim bezpiecznie.                                                               | Wskazówka uwzględnia przejezdność i warunki korzystania z pobocza.                      |
| GDZIE-07   | To strefa zamieszkania — tu piesi rządzą. Zwolnij i przepuść ich.                                       | W strefie zamieszkania jedź najwyżej 20 km/h i ustępuj pieszym.                                                                            | Jedno zdanie obejmuje limit 20 km/h i ustępowanie pieszym.                              |
| GDZIE-09   | Stop! Tu rowery nie mają wstępu — auta jadą tu bardzo szybko. Szukamy innej drogi.                      | Na tym odcinku obowiązuje zakaz jazdy rowerem, więc wybierz inną drogę.                                                                    | Wskazówka dotyczy zakazu niezależnie od prędkości innych pojazdów.                      |
| GDZIE-11   | Ta ścieżka jest wspólna — piesi też tu są. Zwolnij przy nich.                                           | Zwolnij i zostaw miejsce pieszym, a jeśli ścieżka jest podzielona, wybierz część dla rowerów.                                              | Uwzględnia wspólną drogę i wariant z wydzielonymi częściami.                            |
| SYG-02     | Ten sygnalizator z rowerkiem jest dla Ciebie. Ma czerwone — stoisz.                                     | Przy czerwonym świetle z symbolem roweru poczekaj przed przejazdem.                                                                        | Wskazuje miejsce oczekiwania przy czerwonym świetle na przejeździe dla rowerów.         |
| ZNAK-A7    | Odwrócony trójkąt mówi: przepuść innych. Oni mają pierwszeństwo.                                        | Przy odwróconym trójkącie przepuść jadących drogą, na którą wjeżdżasz.                                                                     | Jedno zdanie wskazuje, których uczestników trzeba przepuścić.                           |
| ZNAK-B2T22 | Ta tabliczka pozwala rowerom jechać pod prąd. Bez niej — zakaz wjazdu dotyczy też Ciebie!               | Sprawdź tabliczkę pod zakazem wjazdu i wybierz inną drogę, jeśli zakaz dotyczy Twojego roweru.                                             | Wskazuje, co sprawdzić i jak postąpić, kiedy wyjątek nie obowiązuje.                    |
| ZNAK-B9    | Ten znak zakazuje wjazdu rowerom. Zsiądź albo jedź inną drogą.                                          | Przy zakazie wjazdu rowerów wybierz inną drogę albo przeprowadź rower, jeśli jest chodnik.                                                 | Uzależnia przeprowadzenie roweru od dostępności chodnika.                               |
| ZNAK-B1    | Puste białe koło to zakaz ruchu pojazdów. Rower też jest pojazdem.                                      | Białe koło z czerwoną obwódką oznacza zakaz ruchu także dla rowerów, chyba że tabliczka wskazuje wyjątek.                                  | Uwzględnia wyjątek wskazany tabliczką.                                                  |
| MAN-05     | Z prawej możesz, ale ostrożnie — szczególnie obok ciężarówek i autobusów. Martwe pole!                  | Zwolnij, jeśli obok pojazdu jest mało miejsca albo pojazd zaczyna skręcać.                                                                 | Skupia się na zaobserwowanym braku odstępu lub ryzyku skrętu.                           |
| MAN-08     | Za szybko jak na takie warunki. Zwolnij — wtedy zdążysz zareagować.                                     | Zwolnij, żeby mieć dość miejsca i czasu na zatrzymanie.                                                                                    | Jedno zdanie wiąże prędkość z możliwością zatrzymania.                                  |
| MAN-12     | Auto stanęło przed pasami — pewnie przepuszcza pieszego. Nigdy go nie omijaj!                           | Nie wyprzedzaj na przejściu, przejeździe, skrzyżowaniu bez świateł ani przed torami i nie omijaj auta, które stoi, by przepuścić pieszych. | Wprost podaje zakaz wyprzedzania w tych miejscach i omijania auta ustępującego pieszym. |

## M4d — akt 1 Warszawy, do konsultacji

- **PIER-04** (`weryfikacja: true`) jest regułą ćwiczoną w WAW-A1-04. Zapowiedź Oli dotyczy ustępowania pieszym i rowerzystom przy skręcie, a zdarzenie na zachodnim przyczółku wprowadza pieszego przy zebrze. Do konsultacji pozostaje opis pierwszeństwa oraz dobór sytuacji na przyczółku. To jedyna oflagowana reguła jawnie zadeklarowana do ćwiczenia lub przypisana do wymuszonego zdarzenia w akcie 1.
- Na fragmencie Warszawy przejazdy referencyjne są krótsze niż 2–5 min z docs/03. W M6 wydłużymy trasy i dostosujemy czasy oraz checkpointy po dołączeniu kolejnych kwartałów.
- Zdjęcie w WAW-A1-06 jest akcją w obrębie zlecenia. Trwały Album Znaków należy do M5. Wyścig używa deterministycznej trasy Turbo i nalicza mu werdykty tym samym silnikiem zasad co graczowi.

## M5 — decyzje i treści do sprawdzenia

- Album przechowuje po jednym wycinku obrazu gry 64×64 na kod znaku. Karta czyta `dla_dziecka` z `content/znaki.yaml`. Przed publikacją do potwierdzenia pozostają wpisy oznaczone `weryfikacja: true`: C-13/C-16 (GDZIE-11) oraz S-6 i S-7 (SYG-02).
- Migracja profilu v2→v3 zachowuje rangi, XP, mastery, rekordy i dotychczasowe nagrody. Liczniki osiągnięć startują od zera, ponieważ dotychczasowy profil nie zapisywał historii werdyktów potrzebnej do ich przyznania.
- Osiągnięcia przyznają XP według mnożnika w `balans.yaml` i żetony z katalogu. Werdykty z ticku zawierającego błąd nie zwiększają nowych liczników nagród. Osiągnięcia za kursy liczą wyłącznie bezbłędne ukończenia. Osiągnięcie za serię pytań Sierżant Oli jest nieaktywne, ponieważ obecne pytania kontrolne pojawiają się po naruszeniu. Osobny quiz pozwoli ćwiczyć bez tego warunku.
- Wyzwania preferują najsłabszy moduł spośród tych z grywalnymi szablonami. Obecna pula obejmuje M02–M06. Szablony na quiz, pierwszą pomoc i plac można włączyć po udostępnieniu tych aktywności. Naklejki należą do trwałej kolekcji, a te same wzory mogą wracać w kolejnych dniach.
- Przypomnienie Kazika liczy czas aktywnej sceny jazdy w bieżącej sesji. Ustawienie jest dostępne z menu do czasu udostępnienia Strefy Rodzica. Pauza, ukryta karta i dialogi wstrzymują odliczanie.

## M6d — decyzje i treści do sprawdzenia

- Cykl Wrocławia zaczyna się od dwóch ćwiczeń w Miasteczku i przenosi zlecenia na Rynek po przeglądzie u Kazika. Polecenia SzprychaApp zależą od wybranego miasta. Wyniki, ranga i mastery pozostają wspólne dla całego profilu.
- Mostowy maraton liczy 12 przepraw przez cztery istniejące mosty i kładki. Krótkie zlecenia miejscowe i scenka pierwszej pomocy mogą trwać poniżej dwóch minut.
- Scenka pierwszej pomocy korzysta z czterech wyborów w dialogu, tak jak kampania Warszawy. Ratownik lub nauczyciel EDB powinien sprawdzić scenkę, w tym reakcję na osobę nieprzytomną, która oddycha (PP-04).
- Wrocław używa też reguł oznaczonych do weryfikacji w treści gry. Należy sprawdzić między innymi pierwszeństwo przy skręcie i na przejeździe (PIER-04, PIER-05), przejazd przy niepełnym oznakowaniu (GDZIE-03b) i warunki korzystania z chodnika podczas pogody (GDZIE-04).

## M7a — plac manewrowy

- Zastosowano decyzję [#7](https://github.com/wtomaszewski/szprycha/issues/7) o punktacji 1 / 0,5 / 0 i progu 90%. Dotknięcie linii lub pachołka, częściowe zatrzymanie poza polem oraz poślizg obniżają ocenę do 0,5. Wyjazd środkiem roweru za linię, podparcie, ominięcie pachołka z niewłaściwej strony, zatrzymanie całego roweru poza polem, brak wymaganej sekwencji lub sygnału i upływ czasu dają 0.
- Podparcie w ósemce jest symulowane po utracie prędkości i krótkim postoju w trakcie przejazdu. Przed wydaniem trzeba porównać elementy i kryteria gry z aktualnymi wymaganiami egzaminu szkolnego. Reguły PLAC-01…06 pozostają na liście do konsultacji w §c.
- Medale i lokalny ranking dotyczą czystych przejazdów wszystkich sześciu elementów. Zmiana geometrii lub fizyki rozpoczyna ranking od nowa. Progi medalowe można dostroić w `content/balans.yaml`.

## M7c — egzamin i certyfikat do weryfikacji

- Z aktualnym rozporządzeniem i konsultantem porównać bank i rozkład 25 pytań, progi gry (80% teorii i 90% placu), sześć elementów placu, klasyfikację błędów i punktację 1 / 0,5 / 0. Przejazd kontrolny z progiem dwóch drobnych i zera poważnych błędów jest częścią finału gry. Sprawdzić, jak opisać zakres treningu dziecku i rodzicowi. Parametry są w `content/balans.yaml`.
- Test i przejazd kontrolny oceniają gracza bez przyznawania XP ani zmiany mastery czy kart powtórek. Trening placu używa limitu dziennego mastery dla dobrych nawyków. Przy dwóch ukończonych kampaniach egzamin wybiera ostatnio wybrane miasto.
- Profil v5 przechowuje pierwszą datę wydania i wyniki teorii oraz placu. Przed publikacją sprawdzić brzmienie klauzuli o karcie rowerowej.

## M9c — przygotowanie wydania mobilnego przez Wojtka

- Wybrać ostateczny identyfikator Android/iOS i potwierdzić jego dostępność przed publikacją. `pl.szprycha.game` służy obecnemu buildowi deweloperskiemu.
- Przygotować konta Google Play Console i Apple Developer, wskazać wydawcę i zespół Apple. Skonfigurować klucz aplikacji i klucz przesyłania w Google Play oraz certyfikaty i provisioning w Apple. Materiały podpisu przechowywać poza repozytorium.
- Wypełnić Google Play Data safety i Apple App Privacy zgodnie z działaniem wersji offline. Wybrać grupę wiekową Google Play Families i przedział 9–11 w Apple Kids Category oraz potwierdzić bramkę rodzicielską przed linkami.
- Sprawdzić uruchomienie w trybie samolotowym, zapis po restarcie, wibracje, zgodność UI z safe-area i dostępność polskiego lektora na urządzeniach zgodnie z [BUILD_MOBILE.md](docs/BUILD_MOBILE.md).

## M10b — przed uruchomieniem rankingów (Wojtek)

- Wybrać dostawcę hostingu w UE i region przechowywania bazy oraz kopii zapasowych. Potwierdzić wyłączenie zapisu IP i nagłówków również w proxy oraz zasady usuwania kopii.
- Wybrać domenę API, ustawić HTTPS i originy z rzeczywistych buildów web i mobile. Instrukcja jest w [BUILD_SERVER.md](docs/BUILD_SERVER.md).
- Zaktualizować Google Play Data safety, Apple App Privacy i politykę prywatności przed udostępnieniem wersji z rankingami.

## M10d — przed wydaniem panelu nauczyciela (Wojtek)

- Wybrać hosting w UE dla API, bazy klas i kopii zapasowych oraz domeny panelu i API. Skonfigurować HTTPS i CORS, sprawdzić retencję oraz sposób usuwania danych z kopii. Zweryfikować limity dla połączeń współdzielonych przez szkołę lub reverse proxy. [Instrukcja wdrożenia](docs/BUILD_SERVER.md)
- Ustalić sposób potwierdzania adresu e-mail nauczyciela oraz odzyskiwania konta. Zabezpieczyć domenę nadawcy i dobrać usługę wysyłki e-maili zgodną z wymaganiami hostingu i przetwarzania danych w UE. Obecna wersja rejestruje dorosłego na podstawie oświadczenia, a sesję otwiera po podaniu hasła. Weryfikacja adresu, reset hasła i wysyłka e-maili czekają na decyzję wydawcy.
- Zaktualizować Google Play Data safety i Apple App Privacy dla wydań z rankingami. Uwzględnić pseudonimowy profil gracza, wyniki i członkostwo w klasie oraz zakres danych dostępnych w panelu web.
- Przekazać prawnikowi szablony polityki prywatności dla rodzica i dziecka oraz regulamin. Potwierdzić zasady dobrowolnego udziału w klasie, podstawy i retencję danych uczniów oraz dorosłych, obowiązki szkoły i używanie lokalnych etykiet. [Szablony](legal/)
- Panel pokazuje XP do 1 mln i opanowanie modułów zaokrąglone do pełnych punktów. Dane klasy pochodzą z postępu zapisanego w grze i mają zastosowanie dydaktyczne. Po resecie postęp zdobyty offline wpływa na ranking przy najbliższej synchronizacji. Etykiety są przypisane do członkostwa w danej przeglądarce i należy je usunąć także z innych używanych przeglądarek, jeśli nadal je przechowują.

## #93 — nagrania lektora (Wojtek)

1. Załóż konto ElevenLabs albo zasób Azure Speech na koncie wydawcy. Wybierz plan z licencją komercyjną i polski głos z biblioteki z prawem do użycia w grze, bez klonowania głosu realnej osoby. Posłuchaj wymowy skrótów, numerów znaków i polskich nazw.
2. Sprawdź warunki wybranego planu i głosu. Czy prawa do nagrań zachowujesz po wygaśnięciu subskrypcji? Czy wolno dystrybuować pliki offline w PWA, Google Play i App Store oraz używać ich w treściach dla dzieci? Zapisz wymagane oznaczenia i potwierdzenie w [#7](https://github.com/wtomaszewski/szprycha/issues/7), a w obu plikach licencyjnych wpisz dostawcę, plan, nazwę i ID głosu, datę pozyskania oraz adres i wersję lub datę regulaminu. [Rejestr zasobów](assets/LICENSES.md) · [Polityka licencji](docs/LICENCJE.md#nagrania-lektora).
3. Zainstaluj FFmpeg z enkoderami `libopus` i `aac`. Ustaw lokalnie `VOICE_PROVIDER=elevenlabs` lub `VOICE_PROVIDER=azure` oraz `VOICE_ID`. Dla ElevenLabs ustaw `ELEVENLABS_API_KEY` i opcjonalnie `ELEVENLABS_MODEL_ID` (domyślnie `eleven_multilingual_v2`). Dla Azure ustaw `AZURE_SPEECH_REGION` i `AZURE_SPEECH_KEY`. Wczytaj klucz z lokalnego menedżera sekretów albo w Bash poleceniem `read -rsp 'Klucz TTS: ' ELEVENLABS_API_KEY && export ELEVENLABS_API_KEY` (dla Azure zamień nazwę na `AZURE_SPEECH_KEY`). Klucze pozostają poza repozytorium, CI i logami.
4. Uruchom lokalnie `npm run voice:render`. Skrypt zapisze Opus/OGG oraz AAC/M4A w `assets/voice/pl/` i uzupełni manifest. Przy ponownym uruchomieniu pomija aktualne pary plików dla tego samego głosu i modelu. Jeżeli proces został wymuszony do zakończenia, usuń `assets/voice/.render.lock` po upewnieniu się, że render już nie działa.
5. Przesłuchaj próbki i sprawdź odtwarzanie w trybie samolotowym, także na iOS. Uruchom `npm run voice:check -- --strict`, usuń pliki po wycofanych kwestiach wskazane w raporcie i dołącz do commita pliki audio, manifest oraz wpisy licencyjne. Po samej edycji tekstów odświeżysz manifest bez klucza przez `npm run voice:render -- --manifest-only`. Przed 1.0 włącz tryb ścisły w `tools/voice/check.ts`. Wstępny budżet obu formatów to 20 MiB.

## Do przeglądu prawnika

Lista przed wydaniem komercyjnym. Decyzje i zgody odnotować w [#7](https://github.com/wtomaszewski/szprycha/issues/7).

- Sprawdzić nazwę „SZPRYCHA” i pełny tytuł gry w EUIPO, UPRP, App Store i Google Play. Ocenić ryzyko kolizji oraz potrzebę zgłoszenia znaku.
- Ustalić podmiot wydawcy, właściciela praw i stronę umów z platformami. Założyć lub zweryfikować konta deweloperskie, w tym dane wydawcy publikowane w sklepach.
- Przygotować i zweryfikować politykę prywatności dla rodziców i dzieci oraz regulamin. Sprawdzić zgodność opisów z zachowaniem aplikacji i deklaracjami sklepowymi.
- Potwierdzić spełnienie Google Play Families i Apple Kids Category wg `docs/09_prywatnosc_sklepy.md`. Zweryfikować grupę docelową, formularze Data safety i App Privacy, bramkę rodzicielską oraz lokalizację linków i ewentualnych zakupów.
- Potwierdzić podstawę użycia wizerunków budynków według art. 33 pkt 1 pr. aut. (swoboda panoramy), także przy stylizacjach budynków współczesnych i w materiałach promocyjnych. Sprawdzić m.in. PKiN, Stadion Narodowy, Halę Stulecia, Rotundę, Sky Tower i Centrum Nauki Kopernik. Osobno zweryfikować użycie nazw obiektów w dialogach i opisie sklepowym.
- Ocenić podobieństwo czerwono-żółtego i niebiesko-kremowego malowania tramwajów do oznaczeń przewoźników oraz kolorystyki pojazdów i stroju fikcyjnej Sierżant Oli do oznaczeń służb. Przy przeglądzie pełnej scenerii uwzględnić też stylizacje mostów i figurki krasnali.
- Potwierdzić brzmienie i miejsca wyświetlania klauzuli „Licencja Szprychy nie jest kartą rowerową” w grze, na certyfikacie i w materiałach sprzedażowych.
- Potwierdzić warunki i kompletność atrybucji dla adaptacji PNPOLY i JSTS oraz pozostałych fragmentów osadzonych w dystrybucji Arcade Physics Phasera. Części tych nie wykrywa automatyczna kontrola manifestów npm. Spis potwierdzonych not i odnośniki do źródeł zawiera `assets/licenses/phaser-3.90.0.txt`.
