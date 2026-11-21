# Notatki dla człowieka — M0

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
- **Dostęp do Licencji:** docs/02 wymaga ukończonej kampanii i mastery ≥70 każdego modułu, docs/04 wymaga rangi Mistrz Szlaku i mastery. Propozycja na M7: koniunkcja wszystkich warunków, do decyzji projektowej.
- **Długość tekstów:** komentarz w przepisy.yaml deklaruje ≤160 znaków dla_dziecka, ale GDZIE-04 ma 261, GDZIE-08 166, PIER-08 170, MAN-12 203, MSC-01 197. Nie skrócono merytoryki. Schemat wymaga niepustego opisu, bez limitu 160; limit feedback ≤140 jest egzekwowany. Długie opisy są materiałem do późniejszego albumu, nie gotowymi dymkami misji.
- **Jedno zdanie vs dialog:** AGENTS §2 wymaga jednego zdania w trakcie misji; docs/02 dopuszcza kilka dymków, a docs/04 wyjaśnienie 1–2 zdań. W przyszłości stosować jedno krótkie zdanie podczas akcji, rozwinięcie poza jazdą.
- **Skrót może się opłacać przy obecnych liczbach:** kara minor 150 jest mniejsza niż maksymalny bonus czasu 500. Sam balans nie gwarantuje nadrzędnej zasady. M5 musi testować każdą trasę i zysk czasu, zanim misja zostanie dopuszczona.
- **Opcjonalne odblaski:** WYP-06 jest zaleceniem/bonusem, ale ma waga_bledu: minor. Nie karać za brak zalecenia; przed M2/M5 oddzielić nagradzanie od naruszeń.
- **Wagi i nakładające się reguły:** docs/07 dopuszcza minor przy TTC <2 s, choć PIER-* domyślnie mają major. GDZIE-09 i ZNAK-B9 mają różne wagi dla zakazu; MSC-03/PIER-06 i WYP-04/05/MSC-04 mogą podwójnie punktować jedno zdarzenie. Potrzebna tabela priorytetów i deduplikacja przed M2.
- **Zakres detektorów:** DoD M3 mówi o detektorze albo quiz-only, natomiast dane poprawnie rozróżniają też garaz, scenka i plac. Nie wymuszać detektorów symulacyjnych dla tych typów; raport pokrycia powinien uwzględnić ich osobne implementacje.
- **Pierwsza pomoc a przedstawienie zdarzeń:** AGENTS zabrania karetki z poszkodowanym dzieckiem, M07 opisuje odjazd na kontrolę. Przed M4/M7 ustalić neutralne zakończenie bez pokazywania transportu. PP-04 i scenariusze wymagają recenzji ratownika, bez dorabiania zaleceń w kodzie.
- **Wiek:** docs/09 przewiduje przedziały, docs/07 liczbowy RiderState.age. Propozycja: lokalny przedział i wyprowadzane uprawnienia, bez zbierania daty urodzenia. Uzgodnić granice „do 10 lat” / „poniżej 10” z konsultantem.
- **Materiały nie są dowodem aktualności prawa:** stan_prawny i weryfikacja:false pochodzą z paczki. M0 weryfikuje strukturę, nie potwierdza prawdziwości przepisów. KASK-01, daty reform i całość banku także wymagają końcowej recenzji wskazanej w docs/zrodla_i_stan_prawny.md.
- **Obrazek Q024:** B-2+T-22 jest kompozycją dwóch znaków, nie pojedynczym kodem albumu. Przyszły loader ilustracji powinien rozpoznawać kompozycje; M0 nie ładuje ilustracji quizu.
- **Egzamin praktyczny:** 90% z sześciu binarnych elementów oznacza w praktyce 6/6; sposób liczenia punktów i progi wymagają decyzji przed M7.
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
