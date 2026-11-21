# Scenariusze silnika zasad

`npm test` uruchamia cały zestaw w CI. Sam M2 można sprawdzić poleceniem `npx vitest run tests/rules`. Scenariusze używają mapy `maps/miasteczko.tmj`, jednostek i formatu z [docs/07 §8](../../docs/07_silnik_zasad.md#8-testy-scenariuszowe-testsrulesyaml). Do zmiany pojedynczej cechy mapy służy opcjonalne `properties` indeksowane nazwą obiektu Tiled. `evidence` dopasowuje podzbiór szczegółów werdyktu.

| Detektor | Przypadki w YAML |
| --- | --- |
| KASK-01 | Zapięty, brak, niezapięty, granica 16+, prowadzenie roweru |
| WYP-06 | Obecność odblasków oraz ich brak |
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
