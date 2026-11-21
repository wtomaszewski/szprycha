# Scenariusze silnika zasad

`npm test` uruchamia cały zestaw w CI. Scenariusze silnika zasad można sprawdzić poleceniem `npx vitest run tests/rules`. Scenariusze używają mapy `maps/miasteczko.tmj`, jednostek i formatu z [docs/07 §8](../../docs/07_silnik_zasad.md#8-testy-scenariuszowe-testsrulesyaml). Do zmiany pojedynczej cechy mapy służy opcjonalne `properties` indeksowane nazwą obiektu Tiled. `evidence` dopasowuje podzbiór szczegółów werdyktu.

| Detektor | Przypadki w YAML |
| --- | --- |
| KASK-01 | Zapięty, brak, niezapięty, granica 16+, prowadzenie roweru |
| GDZIE-01 | Wybór DDR, właściwy kierunek, dokładnie i ponad 3 s, krótki i długi powrót |
| GDZIE-04 | Szeroki i wąski chodnik, limity 2 m/50 km/h, DDR obok, ulewa, rola opiekuna |
| GDZIE-05 | Granice 2,5 m/s i 3 m, przekroczenie prędkości, konflikt, nakładanie z GDZIE-04 |
| GDZIE-06 | Prowadzenie, jazda, pieszy na zebrze, przejazd rowerowy, jazda wzdłuż jezdni, ponowne wsiadanie |
| ZNAK-STOP | Pełny postój, jazda bez postoju, granice prędkości i czasu, odległość, konflikt, histereza |
| SYG-01 | Postój na czerwonym, wjazd na czerwonym, decyzja na żółtym według drogi hamowania |
| ZNAK-S2 | Warunkowy skręt, postój, faktyczny kierunek wyjazdu |
| PIER-01 | Ustąpienie, TTC, geometria tras, strona nadjazdu |
| PIER-02 | Ustąpienie przy A-7, granica 1 s, hamowanie ochronne, drugi wjazd, deduplikacja przy STOP |
| MAN-01 | Zgodny, spóźniony i przeciwny sygnał, dokładnie 45°, zmiana pasa |

Testy obok scenariuszy sprawdzają tabelę deduplikacji, dane mapy, teksty werdyktów oraz identyczne odtworzenie logu próbek i sterowania rowerem.

### M3c, część 1

| Detektor | Przypadki w YAML |
| --- | --- |
| PIER-03 | Przepuszczenie jadących z naprzeciwka, wymuszenie, skręt przy zielonym, sam sygnał bez skrętu |
| PIER-04 | Ustąpienie pieszemu, pieszy na drodze wyjazdowej, rowerzysta na przejeździe, jazda prosto |
| PIER-05 | Oczekiwanie przed przejazdem, wjazd tuż przed pojazdem, pojazd nadjeżdżający po wjeździe roweru |
| PIER-06 | Pusty wyjazd, przepuszczenie pojazdu, wymuszenie przy ruszaniu, postój w pasie |
| PIER-07 | Zjazd w prawo, blokowanie z hamowaniem ochronnym, przejazd bez aktywnych sygnałów |
| PIER-08 | Ustąpienie na wlocie z A-7, wymuszenie, wlot bez A-7 |
| PIER-09 | Przepuszczenie tramwaju, hamowanie ochronne, czerwone światło tramwaju |
| MAN-03 | Spojrzenie na granicy 3 s, brak spojrzenia z pojazdem w martwym polu i bez niego |
| MAN-06 | Odstęp powyżej i dokładnie 1 m, postój przed autem |
| MAN-07 | Spojrzenie przed ruszeniem, martwe pole, krótki postój |
| MAN-09 | Jedna ręka, brak obu rąk, nogi poza pedałami, prowadzenie roweru |
| MAN-10 | Jazda solo, przejazd z pasażerem, zejście przed ruszeniem |
| MAN-11 | Odebranie po postoju poza jezdnią, trzymanie telefonu podczas jazdy, postój w ruchu |
| MSC-01 | Otwarty przejazd, migający sygnał, ruch zapory, wyprzedzenie przed torami, postój na torach |
| MSC-02 | Oczekiwanie, wjazd podczas wysiadania, przejazd tramwaju bez postoju |
| MSC-03 | Ustąpienie przed chodnikiem, wyjazd bez postoju, deduplikacja z PIER-06, jazda obok bramy |
| MSC-04 | Włączenie lamp podczas jazdy i przed ruszeniem, deduplikacja we mgle, dobra widoczność |
| WYP-04 | Brak przedniej lampki, włączenie przy ograniczonej widoczności, prowadzenie roweru |
| WYP-05 | Brak tylnej lampki, obie lampki włączone, prowadzenie roweru |

W `m3c.yaml` pole `agents[].inputs` przyjmuje zmiany stanu uczestnika w czasie. Pozycje są interpolowane do kolejnej próbki. `signalOverrides` i `railOverrides` pozwalają wymusić stan wskazanego wlotu lub przejazdu. Test pokrycia sprawdza, czy każdy uruchomiony detektor `sim` ma przynajmniej trzy scenariusze, w tym oczekiwany werdykt i neutralne albo poprawne zachowanie.

### M3c, część 2

W `m3c-part2.yaml` pole `objects` dodaje obiekty do wskazanych warstw Tiled, a `env.officerOrders` ustala polecenia na wlotach. Uczestnik może zgłosić `yieldingAtCrossing`, jeżeli zatrzymał się, aby ustąpić pieszemu. Test pokrycia wymaga co najmniej trzech scenariuszy dla każdej reguły `sim` i dla KASK-01.

| Detektor | Przypadki w YAML |
| --- | --- |
| GDZIE-02 | Kierunek zgodny, jazda pod prąd, prowadzenie roweru |
| GDZIE-03 | Prawa krawędź, jazda lewą stroną, przygotowanie lewego skrętu |
| GDZIE-03b | Pobocze przejezdne, nieprzejezdne i w przeciwnym kierunku |
| GDZIE-07 | Granica 20 km/h, przekroczenie limitu, konflikt z pieszym |
| GDZIE-08 | Para bez konfliktu, hamowanie auta za parą, jazda w rzędzie |
| GDZIE-09 | Zakaz obszarowy ze znakiem i bez znaku, prowadzenie obok zakazu |
| GDZIE-11 | Wolna i zbyt szybka jazda obok pieszego, część piesza i rowerowa |
| SYG-02 | Czerwone i zielone na przejeździe, światło sąsiedniego pasa, kontynuacja rozpoczętego przejazdu |
| SYG-03 | Polecenia sprzeczne ze światłami jezdni lub rowerowymi oraz ze STOP |
| ZNAK-A7 | Wymuszenie i ustąpienie przy A-7, jeden werdykt PIER-02 przy drodze głównej |
| ZNAK-B2T22 | Zakaz, tabliczka z wyjątkiem, przeciwny kierunek znaku |
| ZNAK-B9 | Zakaz ze znaku, przeciwny kierunek znaku, postój bez wjazdu |
| ZNAK-B1 | Zakaz z obu stron, tabliczka z wyjątkiem, prowadzenie roweru |
| MAN-02 | Prawy skręt przy krawędzi, szeroki łuk, jazda prosto |
| MAN-04 | Spojrzenie i sygnał, brak przygotowania, za mały odstęp, jazda za pojazdem |
| MAN-05 | Wyprzedzenie z prawej z odstępem i bez, wyprzedzenie z lewej, ominięcie stojącego |
| MAN-08 | Droga zatrzymania przed pieszym przy różnych prędkościach oraz przy gołoledzi |
| MAN-12 | Czekanie i ominięcie pojazdu ustępującego pieszemu, powód nieznany, niekierowana zebra i skrzyżowanie |
