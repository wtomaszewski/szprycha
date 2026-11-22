# Pokrycie sytuacji drogowych i modułów

<!-- Raport generowany przez npm run coverage:maps. -->

Sytuacje odpowiadają tabeli pokrycia w [dokumentacji map](05_mapy.md). Wiersz z kilkoma wymaganymi elementami jest pokryty, gdy występuje każdy z nich.

Moduł jest pokryty, gdy wykryto co najmniej jedną jego regułę. Raport przypisuje misje do mapy, na której się odbywają. Kolumna mapy obejmuje reguły powiązane z wykrytymi obiektami, a kolumna misji obejmuje reguły deklarowane i wykryte w celach, zdarzeniach oraz miejscach misji.

Aby odtworzyć raport, uruchom `npm run coverage:maps`. Opcja `--strict` (po separatorze `--`) zapisuje raport i kończy się błędem, jeśli w którymkolwiek mieście brakuje mapy, sytuacji lub całego modułu.

## Warszawa

Mapa [warszawa.tmj](../maps/warszawa.tmj)

**Misje na mapie** `WAW-A1-01`, `WAW-A1-02`, `WAW-A1-03`, `WAW-A1-04`, `WAW-A1-05`, `WAW-A1-06`

| Sytuacja drogowa | Pokrycie | Wykryte obiekty lub misje | Brakujące elementy |
| --- | :---: | --- | --- |
| Skrzyżowanie równorzędne | ✓ | `fabryka`, `kamienice`, `osiedle` | — |
| Droga z pierwszeństwem + STOP | ✓ | `stop` | — |
| Sygnalizacja + S-2 + S-6/S-7 | ✗ | `zamek-E-s1`, `zamek-N-s1`, `zamek-S-s1`, `zamek-W-s1` | S-2, sygnał dla rowerzystów |
| Rondo | ✓ | `rondo-E`, `rondo-N`, `rondo-S`, `rondo-W` | — |
| Tramwaj + przystanek bez wysepki | ✗ | — | trasa tramwaju, przystanek bez wysepki |
| DDR, pas rowerowy, ciąg pieszo-rowerowy | ✗ | `ddr-most`, `ddr-zamek-wschod`, `ddr-zamek-zachod` | pas rowerowy, ciąg pieszo-rowerowy |
| Przejazd dla rowerzystów | ✓ | `przejazd-przy-moscie` | — |
| Strefa zamieszkania / pieszych | ✓ | `deptak`, `kocie-lby`, `starowka-d40` | — |
| Wyjazd z drogi wewnętrznej | ✓ | `brama-podworko` | — |
| Przejazd kolejowy | ✗ | — | przejazd kolejowy |
| Pobocze, zakaz wjazdu rowerów | ✗ | `deptak-b9` | pobocze |
| Kontraruch | ✗ | — | B-2 z wyjątkiem dla rowerów |
| Nocna jazda | ✗ | — | zmrok na mapie lub w misji |

| Moduł | Pokrycie | Reguły z mapy | Reguły z misji |
| --- | :---: | --- | --- |
| M01 | ✗ | — | — |
| M02 | ✓ | `GDZIE-01`, `GDZIE-04`, `GDZIE-06`, `GDZIE-07` | `GDZIE-01`, `GDZIE-05`, `GDZIE-06`, `GDZIE-07` |
| M03 | ✓ | `SYG-01`, `ZNAK-A7`, `ZNAK-B1`, `ZNAK-B2T22`, `ZNAK-B9`, `ZNAK-C13`, `ZNAK-D1`, `ZNAK-STOP` | `SYG-03`, `ZNAK-A7`, `ZNAK-B1`, `ZNAK-B2T22`, `ZNAK-STOP` |
| M04 | ✓ | `PIER-01`, `PIER-02`, `PIER-05`, `PIER-06`, `PIER-08` | `PIER-01`, `PIER-02`, `PIER-04`, `PIER-06` |
| M05 | ✓ | `MAN-01`, `MAN-02`, `MAN-03`, `MAN-06`, `MAN-08` | `MAN-01`, `MAN-04`, `MAN-07`, `MAN-08` |
| M06 | ✓ | `MSC-03` | `MSC-03` |
| M07 | ✗ | — | — |

**Pokrycie** 6/13 sytuacji, 5/7 modułów.

## Wrocław

**Brak mapy** `maps/wroclaw.tmj`

**Misje na mapie** —

| Sytuacja drogowa | Pokrycie | Wykryte obiekty lub misje | Brakujące elementy |
| --- | :---: | --- | --- |
| Skrzyżowanie równorzędne | ✗ | — | skrzyżowanie równorzędne |
| Droga z pierwszeństwem + STOP | ✗ | — | D-1 i B-20 na tym samym skrzyżowaniu |
| Sygnalizacja + S-2 + S-6/S-7 | ✗ | — | S-1, S-2, sygnał dla rowerzystów |
| Rondo | ✗ | — | rondo |
| Tramwaj + przystanek bez wysepki | ✗ | — | trasa tramwaju, przystanek bez wysepki |
| DDR, pas rowerowy, ciąg pieszo-rowerowy | ✗ | — | DDR, pas rowerowy, ciąg pieszo-rowerowy |
| Przejazd dla rowerzystów | ✗ | — | przejazd dla rowerzystów |
| Strefa zamieszkania / pieszych | ✗ | — | strefa zamieszkania lub pieszych |
| Wyjazd z drogi wewnętrznej | ✗ | — | wyjazd oznaczony D-47 |
| Przejazd kolejowy | ✗ | — | przejazd kolejowy |
| Pobocze, zakaz wjazdu rowerów | ✗ | — | pobocze, zakaz wjazdu rowerów |
| Kontraruch | ✗ | — | B-2 z wyjątkiem dla rowerów |
| Nocna jazda | ✗ | — | zmrok na mapie lub w misji |

| Moduł | Pokrycie | Reguły z mapy | Reguły z misji |
| --- | :---: | --- | --- |
| M01 | ✗ | — | — |
| M02 | ✗ | — | — |
| M03 | ✗ | — | — |
| M04 | ✗ | — | — |
| M05 | ✗ | — | — |
| M06 | ✗ | — | — |
| M07 | ✗ | — | — |

**Pokrycie** 0/13 sytuacji, 0/7 modułów.

## Miasteczko (wspólny hub)

Mapa [miasteczko.tmj](../maps/miasteczko.tmj)

**Misje na mapie** `WAW-T-01`, `WAW-T-02`

| Sytuacja drogowa | Pokrycie | Wykryte obiekty lub misje | Brakujące elementy |
| --- | :---: | --- | --- |
| Skrzyżowanie równorzędne | ✓ | `equal`, `south-central`, `south-east` | — |
| Droga z pierwszeństwem + STOP | ✓ | `stop` | — |
| Sygnalizacja + S-2 + S-6/S-7 | ✓ | `cycle-lane-lights`, `lights-E-S-1`, `lights-N-S-1`, `lights-S-S-1`, `lights-S-S-2`, `lights-W-S-1`, `tram-signal` | — |
| Rondo | ✗ | — | rondo |
| Tramwaj + przystanek bez wysepki | ✓ | `stop-without-island`, `tram-1` | — |
| DDR, pas rowerowy, ciąg pieszo-rowerowy | ✗ | `bike-lane-top`, `ddr-west`, `ddr-west-north`, `ddr-west-south` | ciąg pieszo-rowerowy |
| Przejazd dla rowerzystów | ✓ | `cycle-lane-equal`, `cycle-lane-lights`, `cycle-lane-lights-zebra`, `cycle-lane-yield`, `cycle-lane-zebra`, `ddr-crossing`, `ddr-crossing-south` | — |
| Strefa zamieszkania / pieszych | ✗ | — | strefa zamieszkania lub pieszych |
| Wyjazd z drogi wewnętrznej | ✗ | — | wyjazd oznaczony D-47 |
| Przejazd kolejowy | ✓ | `rail-crossing` | — |
| Pobocze, zakaz wjazdu rowerów | ✗ | — | pobocze, zakaz wjazdu rowerów |
| Kontraruch | ✗ | — | B-2 z wyjątkiem dla rowerów |
| Nocna jazda | ✓ | `WAW-T-02`, `dusk_at_s` | — |

| Moduł | Pokrycie | Reguły z mapy | Reguły z misji |
| --- | :---: | --- | --- |
| M01 | ✓ | `WYP-04`, `WYP-05` | `KASK-01`, `WYP-04`, `WYP-05` |
| M02 | ✓ | `GDZIE-01`, `GDZIE-02`, `GDZIE-04`, `GDZIE-06` | — |
| M03 | ✓ | `SYG-01`, `SYG-02`, `ZNAK-A7`, `ZNAK-D1`, `ZNAK-S2`, `ZNAK-STOP` | `ZNAK-STOP` |
| M04 | ✓ | `PIER-01`, `PIER-02`, `PIER-05`, `PIER-06`, `PIER-07`, `PIER-09` | — |
| M05 | ✓ | `MAN-01`, `MAN-02`, `MAN-03`, `MAN-06` | — |
| M06 | ✓ | `MSC-01`, `MSC-02`, `MSC-03`, `MSC-04` | `MSC-04` |
| M07 | ✗ | — | — |

**Pokrycie** 7/13 sytuacji, 6/7 modułów.
