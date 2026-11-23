# Audyt wydajności wydania 2/2

Pomiar z 23.11.2026. Bazą jest `main` w rewizji `306d395`, z Radiem Szprycha FM 2.0, kampanią Krakowa i licznikami przy światłach. Obie wersje uruchomiono z buildu produkcyjnego. [Zgłoszenie #123](https://github.com/wtomaszewski/szprycha/issues/123)

## Rozmiar i instalacja PWA

| Pomiar | Przed (B) | Po (B) | Limit CI (B) |
| --- | ---: | ---: | ---: |
| Całe `dist` | 17 793 215 | 16 741 426 | 40 000 000 |
| Precache workera | 17 778 611 | 3 419 341 | — |
| Pierwsze pobranie PWA | 17 782 513 | 3 426 623 | 8 000 000 |
| Zasoby na żądanie | 0 | 13 304 101 | — |

Pierwsze pobranie zmalało o 80,7%. Na zasoby na żądanie składa się 12 425 160 B radia i 878 941 B map miast.

Rozmiary są w bajtach nieskompresowanych (1 MB = 1 000 000 bajtów). Pierwsze pobranie obejmuje unikalne pliki instalowane przez precache oraz skrypt workera. `dist` obejmuje także panel nauczyciela i zasoby pobierane na żądanie. Osobny limit 40 MB zostawia miejsce na przewidziany w repozytorium budżet nagrań lektora do 20 MiB.

Menu, Miasteczko, plac, quiz i wspólne zasoby działają po instalacji offline. Sceny jazdy i placu mają osobne moduły JavaScript. Gra ładuje wybraną mapę, a build zwija JSON map do postaci bez zbędnych odstępów. PWA zapisuje mapy Warszawy, Wrocławia i Krakowa w Cache Storage przy pierwszym wejściu. Przy pierwszym dostrojeniu stacji od razu pobiera jej dżingiel i pierwszy utwór, a pozostałe utwory pobiera w tle podczas odsłuchu. Dostępne pliki lektora są pobierane przy odtworzeniu. Pobrane pliki o tej samej treści pozostają dostępne po aktualizacji. Paczka Capacitor zawiera wszystkie zasoby.

Build korzysta z 42 gotowych MP3 z generatora w repozytorium. Sprawdzono go po `npm ci` ze ścieżką ograniczoną do Node, npm i powłoki. `licenses:check` zweryfikował licencje zależności produkcyjnych. [Zasady licencji](LICENCJE.md) · [Prywatność Cache Storage](09_prywatnosc_sklepy.md#zasoby-pwa-dostępne-offline)

## Czas startu

Chromium 156 headless, 1280 × 720, emulacja CPU 4× i Fast 3G (1,6 Mb/s pobieranie, 0,75 Mb/s wysyłanie, 150 ms opóźnienia). Każda próba startuje na zimno w osobnym profilu przeglądarki. Na potrzeby pomiaru wyłączono workera, aby obie wersje pobierały pliki na tej samej emulowanej sieci bez równoległego precache. Przedział od menu zaczyna się przed wyborem trybu i kończy po utworzeniu sceny jazdy oraz ustawieniu pozycji roweru.

| Scenariusz | Przed (s) | Po (s) | Limit CI (s) |
| --- | ---: | ---: | ---: |
| Otwarcie → menu (8 prób) | 5,75 | 5,80 | 12 |
| Menu → jazda (Miasteczko) | 5,23 | 5,98 | 14 |
| Menu → jazda (Warszawa) | 9,68 | 9,97 | 18 |
| Menu → jazda (Wrocław) | 8,77 | 9,67 | 15 |
| Menu → jazda (Kraków) | 8,07 | 10,41 | 15 |

Tabela podaje średnią z dwóch prób na mapę. W tej serii zimny start jazdy trwał o 0,29–2,34 s dłużej. Pierwsze wejście do jazdy obejmuje pobranie modułu sceny i przygotowanie tekstur. Każdy scenariusz mieści się w limicie. Limity CI mają zapas na wahania obciążenia maszyny i emulowanej sieci.

## Płynność jazdy

`benchmark:driving` używa Chromium 156 headless, WebGL, 1280 × 720 i CPU 4×. Obie wersje uruchomiono z pełną grafiką i tymi samymi punktami startu. Dane obejmują odstępy między klatkami z `requestAnimationFrame`, po pierwszej sekundzie rozgrzewki. Pomiar trwa 5,5 s w Miasteczku i 12 s na pozostałych trasach. Miasteczko ma krótszy odcinek, zanim rower dojedzie do przeszkody. Nocne próby obejmują włączoną lampkę i deszcz.

| Pomiar | FPS przed | FPS po | p95 przed (ms) | p95 po (ms) |
| --- | ---: | ---: | ---: | ---: |
| Miasteczko, dzień | 55,6 | 58,9 | 16,8 | 16,8 |
| Miasteczko, noc i deszcz | 58,0 | 59,6 | 16,8 | 16,8 |
| Warszawa (Praga), dzień | 57,4 | 58,5 | 16,8 | 16,8 |
| Warszawa (Praga), noc i deszcz | 52,2 | 55,8 | 33,4 | 33,3 |
| Wrocław (Bulwary), dzień | 59,7 | 59,7 | 16,8 | 16,7 |
| Wrocław (Bulwary), noc i deszcz | 36,1 | 45,0 | 50,0 | 33,4 |
| Kraków (Rynek), dzień | 58,2 | 59,4 | 16,7 | 16,8 |
| Kraków (Rynek), noc i deszcz (mediana trzech prób) | 57,3 | 56,0 | 16,8 | 33,3 |

Dla Miasteczka i Krakowa tabela podaje powtórkę po sześciu sekundach stabilizacji sceny przed ruszeniem. W dodatkowej próbie Miasteczka z ruszeniem bez tego odczekania średnia spadła z 60,0 do 57,8 FPS w dzień i z 59,8 do 56,7 FPS w nocy z deszczem. p95 obu wersji mieścił się wtedy w przedziale 16,7–16,8 ms. Pobieranie kolejnych utworów ma niski priorytet i w miarę dostępności korzysta z bezczynności przeglądarki.

Geometria kałuż jest ponownie wyliczana po przesunięciu widoku do kolejnego pola siatki lub zmianie oświetlenia albo rozmiaru widoku. Widoczność fragmentów mapy korzysta z granic kamery zaokrąglonych na zewnątrz do siatki kafelków. Nocny Kraków nadal odstaje od kryterium braku regresji. W trzech próbach p95 wyniósł 16,8–33,3 ms na `main` i 33,2–33,4 ms po zmianach.

Skrzyżowanie w Miasteczku mierzono osobno z postoju przy sygnalizatorach (2170, 637), przy aktywnym ruchu AI. W obu wersjach powtórzono próbę z licznikami i po ich wyłączeniu w ustawieniach dostępności.

| Pomiar | FPS przed | FPS po | p95 przed (ms) | p95 po (ms) |
| --- | ---: | ---: | ---: | ---: |
| Liczniki włączone | 53,8 | 58,5 | 16,8 | 16,8 |
| Liczniki wyłączone | 59,8 | 59,5 | 16,8 | 16,7 |

## Pamięć i zmiana miast

Środowisko jak w pomiarze jazdy. CDP wymusza GC przed odczytem sterty JavaScript oraz liczby słuchaczy. Koszt tekstur to suma powierzchni źródeł tekstur Phaser pomnożona przez 4 bajty na piksel. Ten szacunek pozwala porównać zakres cache tekstur między wersjami. Pamięć GPU i dekodera audio wymaga osobnego pomiaru.

| Miasteczko | Sterta przed zmianą (MB) | Sterta po zmianie (MB) | Tekstury przed / po | Słuchacze przed / po |
| --- | ---: | ---: | ---: | ---: |
| Początek jazdy | 19,08 | 17,80 | 132 / 132 | 284 / 283 |
| Po 10 minutach jazdy | 20,00 | 18,90 | 132 / 132 | 284 / 284 |

Przejazd powtarzał bezpieczny odcinek z powrotem na start co 5 s. W obu wersjach wzrost sterty pozostał w granicach 1,1 MB. W badanym okresie liczba tekstur pozostała stała. Liczba słuchaczy po zmianie wzrosła o jeden i po dziesięciu minutach wynosiła 284 w obu wersjach.

| Mapa po dwóch cyklach przełączania | Tekstury przed | Tekstury po | Szacowana pamięć przed (MB) | Szacowana pamięć po (MB) | Słuchacze przed / po |
| --- | ---: | ---: | ---: | ---: | ---: |
| Warszawa | 1 275 | 446 | 446,39 | 159,31 | 208 / 207 |
| Wrocław | 1 280 | 520 | 446,39 | 183,41 | 208 / 207 |
| Kraków | 1 263 | 336 | 446,39 | 140,64 | 208 / 207 |

Pomiar przełączeń wykonano w osobnym przebiegu. Przy zmianie miasta gra zwalnia tekstury terenu i bloków poprzedniej mapy oraz zwalnia jej dane w Phaserze. Zapisane na dysku pliki map i współdzielone atlasy pozostają dostępne. W drugiej rundzie szacowany koszt tekstur dla tego samego miasta zmienił się najwyżej o 22 kB, bez wzrostu liczby słuchaczy.

## Odtworzenie pomiarów i granice audytu

- `npm run build && npm run budget:bundle` sprawdza rozmiar. Podanie ścieżki jako argumentu umożliwia sprawdzenie innego buildu.
- `npm run benchmark:startup` uruchamia tymczasowy podgląd buildu i wykonuje dwa starty dla każdej mapy. CI kończy krok błędem po przekroczeniu średniego czasu w dowolnym scenariuszu.
- Uruchom podgląd buildu i ustaw `BENCH_URL`. W kolejnych próbach `npm run benchmark:driving` ustaw `BENCH_MAP=miasteczko|warszawa|wroclaw|krakow` oraz `BENCH_LIGHT=night BENCH_RAIN=1` dla nocy z deszczem. Liczniki mierz z `BENCH_MAP=miasteczko BENCH_FRAGMENT=sygnalizacja`. `BENCH_COUNTDOWNS=0` mierzy próbę porównawczą. `BENCH_RUNS` ustawia liczbę prób, a `BENCH_SETTLE_MS=6000` dodaje sześć sekund stabilizacji sceny przed ruszeniem. Pomiar Wrocławia używa `BENCH_FRAGMENT=bulwary`.
- `npm run benchmark:memory` wykonuje dziesięć minut jazdy w Miasteczku i dwa cykle zmiany miast. `BENCH_MINUTES` skraca jazdę do szybkiej kontroli przełączania. Skrypty benchmarków zapisują JSON w `test-results/`. `BENCH_CHROMIUM_PATH` wskazuje lokalną binarkę zamiast Chromium z Playwright.
- E2E sprawdza świeżą instalację z jazdą w Miasteczku offline, wybór i ponowne otwarcie pobranej mapy offline oraz pobranie i odsłuch wszystkich sześciu stacji po odłączeniu sieci. Emulowany telefon z czterema logicznymi rdzeniami wybiera uproszczoną grafikę i zachowuje ręczny wybór po przeładowaniu. [Zrzut ustawienia grafiki](screenshots/123-automatyczna-grafika.png)
- Na później pozostają pomiary na fizycznym Androidzie i iOS, pomiar pamięci GPU, dalsza analiza zimnego startu jazdy i p95 nocnego Krakowa oraz odsłuch offline nagranego lektora. Repozytorium zawiera manifest kwestii bez nagranych plików. `voice:check` przechodzi z ostrzeżeniem o ich braku.
