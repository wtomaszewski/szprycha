# M04 — Pierwszeństwo

## Cel
Dziecko rozpoznaje typ skrzyżowania (równorzędne, z drogą z pierwszeństwem, z sygnalizacją, rondo) i poprawnie rozstrzyga, kto jedzie pierwszy, uwzględniając tramwaj, pieszych, pojazdy uprzywilejowane, włączanie się do ruchu i przejazdy dla rowerzystów.

## Algorytm dla dziecka („Szprychowa ściągawka”)
1. Czy jest **policjant**? → słucham go.
2. Czy są **światła**? → jadę wg świateł (zielona strzałka = stop i przepuść).
3. Czy są **znaki** (A-7, STOP, D-1)? → kto jest na drodze głównej, ten ma pierwszeństwo.
4. Nic z tego? → **tramwaj** jedzie pierwszy, potem **prawa ręka**.
5. Skręcam w lewo? → przepuszczam jadących z naprzeciwka prosto i w prawo.
6. Skręcam w ogóle? → przepuszczam pieszych na drodze, w którą wjeżdżam, i rowerzystów jadących prosto.
7. Wyjeżdżam z bramy, parkingu, ruszam z miejsca? → przepuszczam **wszystkich**.
8. Słyszę syrenę? → zjeżdżam na prawo.

Ten algorytm jest też kolejnością rozstrzygania w `IntersectionManager` (docs/07 §5).

## Przepisy
PIER-01 (prawa ręka), PIER-02 (główna/podporządkowana), PIER-03 (skręt w lewo), PIER-04 (piesi i rowerzyści przy skręcie, *weryfikacja*), PIER-05 (przejazd dla rowerzystów, *weryfikacja*), PIER-06 (włączanie się do ruchu), PIER-07 (pojazd uprzywilejowany), PIER-08 (rondo), PIER-09 (tramwaj, *weryfikacja*).

## Typowe błędy dzieci
„Rower jest mały, więc mnie przepuszczą” · „Jestem na przejeździe dla rowerzystów, więc mogę wjechać zawsze” · patrzenie tylko w lewo · skręt w lewo przed nadjeżdżającym z naprzeciwka · wyjazd z bramy prosto na chodnik/jezdnię · ignorowanie tramwaju · na rondzie zjazd bez sygnalizacji.

## Jak uczy gra
- **Praga (Warszawa) i Ostrów/Zachód (Wrocław)** to poligony skrzyżowań równorzędnych; zdarzenia wymuszone gwarantują auto z prawej w pierwszych misjach.
- **Stop-klatka „Kto pierwszy?”:** przy błędzie pierwszeństwa kamera pokazuje skrzyżowanie z góry, strzałki obu pojazdów i znak, który rozstrzyga. Gracz 1 kliknięciem wskazuje, kto miał pierwszeństwo (mikro-quiz w kontekście).
- **Turbo** w wyścigach zawsze wymusza pierwszeństwo — Sierżant Ola go zatrzymuje, gracz go wyprzedza.
- **Wyzwanie Ronda ×5** (poboczne w obu miastach).
- **Pojazd uprzywilejowany** jako zdarzenie losowe — dźwięk syreny + strzałka kierunku przy krawędzi ekranu.

## Linie Sierżant Oli (dodatkowe)
- „Nikt nie ma pierwszeństwa „na zawsze”. Nawet gdy masz rację — patrz, czy kierowca Cię widzi.”
- „Tramwaj waży tyle, co kilkanaście aut i nie skręci. Daj mu przejechać.”
- „Z bramy wyjeżdżasz jako ostatni w kolejce — wszyscy inni mają pierwszeństwo.”

## Pytania
Q029–Q036.

## Ćwiczenie w realu
Na rysunku skrzyżowania (lub z klocków/autek) rodzic ustawia pojazdy, dziecko mówi kolejność przejazdu wg „Szprychowej ściągawki”.
