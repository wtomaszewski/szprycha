# Pokrycie sytuacji drogowych i modułów

<!-- Raport generowany przez npm run coverage:maps. -->

Sytuacje odpowiadają tabeli pokrycia w [dokumentacji map](05_mapy.md). Wiersz z kilkoma wymaganymi elementami jest pokryty, gdy występuje każdy z nich.

W każdym mieście moduł jest pokryty, gdy wykryto co najmniej jedną jego regułę w misjach. Moduły wspólnego hubu są liczone informacyjnie, także z obiektów mapy. Raport przypisuje misje do mapy, na której się odbywają. Kolumna mapy obejmuje reguły powiązane z wykrytymi obiektami, a kolumna misji obejmuje reguły deklarowane i wykryte w celach, zdarzeniach oraz miejscach misji.

Aby odtworzyć raport, uruchom `npm run coverage:maps`. Opcja `--strict` (po separatorze `--`) zapisuje raport i kończy się błędem, jeśli w którymkolwiek mieście brakuje mapy, sytuacji lub całego modułu albo brakuje pokrycia reguł placu.

## Gdańsk

Mapa [gdansk.tmj](../maps/gdansk.tmj)

**Misje na mapie** `GDA-A1-01`, `GDA-A1-02`, `GDA-A1-03`, `GDA-A2-01`, `GDA-A2-02`, `GDA-A2-03`, `GDA-A3-01`, `GDA-A3-02`, `GDA-A3-03`, `GDA-B-01`, `GDA-B-02`, `GDA-B-03`, `GDA-B-04`

| Sytuacja drogowa | Pokrycie | Wykryte obiekty lub misje | Brakujące elementy |
| --- | :---: | --- | --- |
| Skrzyżowanie równorzędne | ✓ | `brzezno`, `olowianka` | — |
| Droga z pierwszeństwem + STOP | ✓ | `targ` | — |
| Sygnalizacja + S-2 + S-6/S-7 | ✓ | `aleja-E-s1`, `aleja-N-s1`, `aleja-S-s1`, `aleja-W-s1`, `aleja-przejazd`, `aleja-strzalka`, `aleja-tram-N-s1` | — |
| Rondo | ✓ | `rondo-E`, `rondo-N`, `rondo-S`, `rondo-W` | — |
| Tramwaj + przystanek bez wysepki | ✓ | `aleja-przystanek`, `tramwaj-nabrzeze` | — |
| DDR, pas rowerowy, ciąg pieszo-rowerowy | ✓ | `aleja-ddr-polnoc`, `aleja-ddr-poludnie`, `ddr-motlawa-0`, `ddr-motlawa-1088`, `ddr-motlawa-2560`, `ddr-motlawa-4064`, `kladka-stocznia`, `promenada`, `promenada-wschod`, `promenada-zachod`, `stocznia-dojscie`, `stocznia-drugi-brzeg`, `stocznia-kontrapas` | — |
| Przejazd dla rowerzystów | ✓ | `aleja-przejazd`, `motlawa-przejazd-1024`, `motlawa-przejazd-2432`, `motlawa-przejazd-4000` | — |
| Strefa zamieszkania / pieszych | ✓ | `dlugi-targ`, `skrot-miedzy-halami`, `skrot-przez-targ`, `stocznia-nabrzeze`, `targ-dojscie`, `zuraw-nabrzeze` | — |
| Wyjazd z drogi wewnętrznej | ✓ | `wyjazd-magazyn` | — |
| Przejazd kolejowy | ✓ | `olowianka-kolej` | — |
| Pobocze, zakaz wjazdu rowerów | ✓ | `kladka-zuraw`, `kladka-zuraw-B-9-N`, `pobocze-e`, `pobocze-w` | — |
| Kontraruch | ✓ | `stocznia-wjazd-B-2-S` | — |
| Nocna jazda | ✓ | `GDA-A1-03`, `GDA-B-01`, `dusk_at_s` | — |

| Moduł | Pokrycie | Reguły z mapy | Reguły z misji |
| --- | :---: | --- | --- |
| M01 | ✓ | `WYP-04`, `WYP-05`, `WYP-06` | `KASK-01`, `WYP-04`, `WYP-05`, `WYP-06` |
| M02 | ✓ | `GDZIE-01`, `GDZIE-02`, `GDZIE-03b`, `GDZIE-04`, `GDZIE-06`, `GDZIE-07`, `GDZIE-09`, `GDZIE-11` | `GDZIE-01`, `GDZIE-03b`, `GDZIE-07`, `GDZIE-09`, `GDZIE-11` |
| M03 | ✓ | `SYG-01`, `SYG-02`, `ZNAK-A7`, `ZNAK-B1`, `ZNAK-B2T22`, `ZNAK-B9`, `ZNAK-C13`, `ZNAK-D1`, `ZNAK-S2`, `ZNAK-STOP` | `SYG-01`, `SYG-02`, `ZNAK-B1`, `ZNAK-B9` |
| M04 | ✓ | `PIER-01`, `PIER-02`, `PIER-05`, `PIER-06`, `PIER-08`, `PIER-09` | `PIER-05` |
| M05 | ✓ | `MAN-01`, `MAN-02`, `MAN-03`, `MAN-08` | `MAN-08` |
| M06 | ✓ | `MSC-01`, `MSC-02`, `MSC-03`, `MSC-04` | `MSC-01`, `MSC-02`, `MSC-04`, `MSC-05` |
| M07 | ✓ | — | `PP-01`, `PP-02`, `PP-03` |

**Pokrycie** 13/13 sytuacji, 7/7 modułów.

## Kraków

Mapa [krakow.tmj](../maps/krakow.tmj)

**Misje na mapie** `KRA-A1-01`, `KRA-A1-02`, `KRA-A1-03`, `KRA-A1-04`, `KRA-A1-05`, `KRA-A2-01`, `KRA-A2-02`, `KRA-A2-03`, `KRA-A2-04`, `KRA-A2-05`, `KRA-A3-01`, `KRA-A3-02`, `KRA-A3-03`, `KRA-A3-04`, `KRA-A3-05`, `KRA-B-01`, `KRA-B-02`, `KRA-B-03`

| Sytuacja drogowa | Pokrycie | Wykryte obiekty lub misje | Brakujące elementy |
| --- | :---: | --- | --- |
| Skrzyżowanie równorzędne | ✓ | `debnik`, `ogrody` | — |
| Droga z pierwszeństwem + STOP | ✓ | `targ` | — |
| Sygnalizacja + S-2 + S-6/S-7 | ✓ | `aleja-E-s1`, `aleja-N-s1`, `aleja-S-s1`, `aleja-W-s1`, `aleja-przejazd`, `aleja-strzalka`, `aleja-tram-N-s1` | — |
| Rondo | ✓ | `rondo-E`, `rondo-N`, `rondo-S`, `rondo-W` | — |
| Tramwaj + przystanek bez wysepki | ✓ | `aleja-przystanek`, `tramwaj-aleja` | — |
| DDR, pas rowerowy, ciąg pieszo-rowerowy | ✓ | `bulwary-wjazd-e`, `bulwary-wjazd-w`, `ciag-bulwary`, `ddr-bulwary-0`, `ddr-bulwary-1088`, `ddr-bulwary-2560`, `ddr-bulwary-4064`, `ddr-przejazd-polnoc`, `ddr-przejazd-poludnie`, `kontrapas-kazimierz`, `lacze-ddr-kazimierz` | — |
| Przejazd dla rowerzystów | ✓ | `aleja-przejazd`, `bulwary-przejazd-1024`, `bulwary-przejazd-2432`, `bulwary-przejazd-4000` | — |
| Strefa zamieszkania / pieszych | ✓ | `kazimierz-dojscie`, `kazimierz-plac`, `rynek-deptak`, `rynek-dojscie` | — |
| Wyjazd z drogi wewnętrznej | ✓ | `wyjazd-podworze` | — |
| Przejazd kolejowy | ✓ | `debnik-kolej` | — |
| Pobocze, zakaz wjazdu rowerów | ✓ | `kopiec-zakaz`, `kopiec-zakaz-B-9-W`, `pobocze-e`, `pobocze-w`, `rynek-deptak-B-9-S` | — |
| Kontraruch | ✓ | `uliczka-kazimierz-B-2-S` | — |
| Nocna jazda | ✓ | `KRA-A2-04`, `KRA-B-01`, `dusk_at_s` | — |

| Moduł | Pokrycie | Reguły z mapy | Reguły z misji |
| --- | :---: | --- | --- |
| M01 | ✓ | `WYP-04`, `WYP-05`, `WYP-06` | `KASK-01`, `WYP-04`, `WYP-05`, `WYP-06` |
| M02 | ✓ | `GDZIE-01`, `GDZIE-02`, `GDZIE-03b`, `GDZIE-04`, `GDZIE-06`, `GDZIE-07`, `GDZIE-09`, `GDZIE-11` | `GDZIE-01`, `GDZIE-02`, `GDZIE-03b`, `GDZIE-04`, `GDZIE-06`, `GDZIE-07`, `GDZIE-11` |
| M03 | ✓ | `SYG-01`, `SYG-02`, `ZNAK-A7`, `ZNAK-B1`, `ZNAK-B2T22`, `ZNAK-B9`, `ZNAK-C13`, `ZNAK-D1`, `ZNAK-S2`, `ZNAK-STOP` | `SYG-01`, `SYG-02`, `ZNAK-A7`, `ZNAK-B1`, `ZNAK-B2T22`, `ZNAK-B9`, `ZNAK-STOP` |
| M04 | ✓ | `PIER-01`, `PIER-02`, `PIER-05`, `PIER-06`, `PIER-08`, `PIER-09` | `PIER-02`, `PIER-08` |
| M05 | ✓ | `MAN-01`, `MAN-02`, `MAN-03`, `MAN-08` | `MAN-01`, `MAN-08` |
| M06 | ✓ | `MSC-01`, `MSC-02`, `MSC-03`, `MSC-04` | `MSC-01`, `MSC-02`, `MSC-04`, `MSC-05` |
| M07 | ✓ | — | `PP-01`, `PP-02`, `PP-03` |

**Pokrycie** 13/13 sytuacji, 7/7 modułów.

## Łódź

Mapa [lodz.tmj](../maps/lodz.tmj)

**Misje na mapie** `LOD-B-01`, `LOD-B-02`, `LOD-B-03`, `LOD-B-04`

| Sytuacja drogowa | Pokrycie | Wykryte obiekty lub misje | Brakujące elementy |
| --- | :---: | --- | --- |
| Skrzyżowanie równorzędne | ✓ | `kolejowa`, `magazyny` | — |
| Droga z pierwszeństwem + STOP | ✓ | `srodmiescie` | — |
| Sygnalizacja + S-2 + S-6/S-7 | ✓ | `aleja-E-s1`, `aleja-N-s1`, `aleja-S-s1`, `aleja-W-s1`, `aleja-przejazd`, `aleja-strzalka`, `aleja-tram-N-s1` | — |
| Rondo | ✓ | `rondo-E`, `rondo-N`, `rondo-S`, `rondo-W` | — |
| Tramwaj + przystanek bez wysepki | ✓ | `przystanek-aleja`, `tramwaj-w-alei` | — |
| DDR, pas rowerowy, ciąg pieszo-rowerowy | ✓ | `aleja-ddr-polnoc`, `aleja-ddr-poludnie`, `kontrapas`, `park-ciag-pieszo-rowerowy` | — |
| Przejazd dla rowerzystów | ✓ | `aleja-przejazd` | — |
| Strefa zamieszkania / pieszych | ✓ | `pasaz-drugi-wlot`, `pasaz-wylaczony`, `piotrkowska` | — |
| Wyjazd z drogi wewnętrznej | ✓ | `brama-podworka` | — |
| Przejazd kolejowy | ✓ | `kolej-przejazd` | — |
| Pobocze, zakaz wjazdu rowerów | ✓ | `park-alejka-piesza`, `park-alejka-piesza-B-9-N`, `pobocze-e`, `pobocze-w` | — |
| Kontraruch | ✓ | `uliczka-jednokierunkowa-B-2-S` | — |
| Nocna jazda | ✓ | `LOD-B-03`, `dusk_at_s` | — |

| Moduł | Pokrycie | Reguły z mapy | Reguły z misji |
| --- | :---: | --- | --- |
| M01 | ✓ | `WYP-04`, `WYP-05`, `WYP-06` | `KASK-01`, `WYP-04`, `WYP-05`, `WYP-06` |
| M02 | ✓ | `GDZIE-01`, `GDZIE-02`, `GDZIE-03b`, `GDZIE-04`, `GDZIE-06`, `GDZIE-07`, `GDZIE-09`, `GDZIE-11` | `GDZIE-02`, `GDZIE-07` |
| M03 | ✓ | `SYG-01`, `SYG-02`, `ZNAK-A7`, `ZNAK-B1`, `ZNAK-B2T22`, `ZNAK-B9`, `ZNAK-C13`, `ZNAK-D1`, `ZNAK-S2`, `ZNAK-STOP` | `ZNAK-B1`, `ZNAK-B2T22` |
| M04 | ✓ | `PIER-01`, `PIER-02`, `PIER-05`, `PIER-06`, `PIER-08`, `PIER-09` | `PIER-06` |
| M05 | ✓ | `MAN-01`, `MAN-02`, `MAN-03`, `MAN-14` | `MAN-14` |
| M06 | ✓ | `MSC-01`, `MSC-02`, `MSC-03`, `MSC-04` | `MSC-03`, `MSC-04` |
| M07 | ✓ | — | `PP-01` |

**Pokrycie** 13/13 sytuacji, 7/7 modułów.

## Poznań

Mapa [poznan.tmj](../maps/poznan.tmj)

**Misje na mapie** `POZ-A1-01`, `POZ-A1-02`, `POZ-A2-01`, `POZ-A2-02`, `POZ-A3-01`, `POZ-A3-02`, `POZ-B-01`, `POZ-B-02`, `POZ-B-03`, `POZ-B-04`

| Sytuacja drogowa | Pokrycie | Wykryte obiekty lub misje | Brakujące elementy |
| --- | :---: | --- | --- |
| Skrzyżowanie równorzędne | ✓ | `kolejowa`, `ogrody` | — |
| Droga z pierwszeństwem + STOP | ✓ | `rynek` | — |
| Sygnalizacja + S-2 + S-6/S-7 | ✓ | `aleja-E-s1`, `aleja-N-s1`, `aleja-S-s1`, `aleja-W-s1`, `aleja-przejazd`, `aleja-strzalka`, `aleja-tram-N-s1` | — |
| Rondo | ✓ | `rondo-E`, `rondo-N`, `rondo-S`, `rondo-W` | — |
| Tramwaj + przystanek bez wysepki | ✓ | `przystanek-bez-wysepki`, `tramwaj-warta` | — |
| DDR, pas rowerowy, ciąg pieszo-rowerowy | ✓ | `aleja-ddr-polnoc`, `aleja-ddr-poludnie`, `browar-kontrapas`, `bulwar-pieszo-rowerowy`, `ddr-warta-0`, `ddr-warta-1088`, `ddr-warta-2560`, `ddr-warta-4064`, `dojazd-do-sluzy`, `most-tumski`, `ostrow-dojscie`, `sluza-rowerowa` | — |
| Przejazd dla rowerzystów | ✓ | `aleja-przejazd`, `warta-przejazd-1024`, `warta-przejazd-2432`, `warta-przejazd-4000` | — |
| Strefa zamieszkania / pieszych | ✓ | `dziedziniec-browaru`, `ostrow-tumski`, `skrot-przez-pasaz`, `stary-rynek` | — |
| Wyjazd z drogi wewnętrznej | ✓ | `browar-wyjazd` | — |
| Przejazd kolejowy | ✓ | `kolej-przejazd` | — |
| Pobocze, zakaz wjazdu rowerów | ✓ | `alejka-przy-katedrze`, `alejka-przy-katedrze-B-9-N`, `pobocze-e`, `pobocze-w` | — |
| Kontraruch | ✓ | `browar-wyjazd-B-2-N` | — |
| Nocna jazda | ✓ | `POZ-A3-01`, `POZ-B-04`, `dusk_at_s` | — |

| Moduł | Pokrycie | Reguły z mapy | Reguły z misji |
| --- | :---: | --- | --- |
| M01 | ✓ | `WYP-04`, `WYP-05`, `WYP-06` | `KASK-01`, `WYP-04`, `WYP-05`, `WYP-06` |
| M02 | ✓ | `GDZIE-01`, `GDZIE-02`, `GDZIE-03b`, `GDZIE-04`, `GDZIE-06`, `GDZIE-07`, `GDZIE-09`, `GDZIE-11` | `GDZIE-02`, `GDZIE-04`, `GDZIE-07`, `GDZIE-09`, `GDZIE-11`, `GDZIE-13` |
| M03 | ✓ | `SYG-01`, `SYG-02`, `ZNAK-A7`, `ZNAK-B1`, `ZNAK-B2T22`, `ZNAK-B9`, `ZNAK-C13`, `ZNAK-D1`, `ZNAK-S2`, `ZNAK-STOP` | `SYG-01`, `ZNAK-B1`, `ZNAK-B9` |
| M04 | ✓ | `PIER-01`, `PIER-02`, `PIER-05`, `PIER-06`, `PIER-08`, `PIER-09`, `PIER-10` | `PIER-10` |
| M05 | ✓ | `MAN-01`, `MAN-02`, `MAN-03` | `MAN-01` |
| M06 | ✓ | `MSC-01`, `MSC-02`, `MSC-03`, `MSC-04` | `MSC-04` |
| M07 | ✓ | — | `PP-01`, `PP-03` |

**Pokrycie** 13/13 sytuacji, 7/7 modułów.

## Warszawa

Mapa [warszawa.tmj](../maps/warszawa.tmj)

**Misje na mapie** `WAW-A1-01`, `WAW-A1-02`, `WAW-A1-03`, `WAW-A1-04`, `WAW-A1-05`, `WAW-A1-06`, `WAW-A2-01`, `WAW-A2-02`, `WAW-A2-03`, `WAW-A2-04`, `WAW-A2-05`, `WAW-A2-06`, `WAW-A3-01`, `WAW-A3-02`, `WAW-A3-03`, `WAW-A3-04`, `WAW-A3-05`, `WAW-A3-06`

| Sytuacja drogowa | Pokrycie | Wykryte obiekty lub misje | Brakujące elementy |
| --- | :---: | --- | --- |
| Skrzyżowanie równorzędne | ✓ | `fabryka`, `kamienice`, `osiedle` | — |
| Droga z pierwszeństwem + STOP | ✓ | `stop` | — |
| Sygnalizacja + S-2 + S-6/S-7 | ✓ | `palac-E-s1`, `palac-N-s1`, `palac-N-s2`, `palac-S-s1`, `palac-W-s1`, `palac-tram-s1`, `pod-palacem-przejazd`, `zamek-E-s1`, `zamek-N-s1`, `zamek-S-s1`, `zamek-W-s1` | — |
| Rondo | ✓ | `rondo-E`, `rondo-N`, `rondo-S`, `rondo-W` | — |
| Tramwaj + przystanek bez wysepki | ✓ | `palac-przystanek-bez-wysepki`, `tramwaj-aleja` | — |
| DDR, pas rowerowy, ciąg pieszo-rowerowy | ✓ | `bulwar-nierownosci`, `ciag-dzielony-piesi`, `ciag-dzielony-rowery`, `ciag-wspolny-bulwary`, `ddr-bulwary`, `ddr-most`, `ddr-palac-wschod`, `ddr-palac-zachod`, `ddr-zamek-wschod`, `ddr-zamek-zachod`, `kontrapas-centrum`, `lazienki-ciag-wspolny`, `lazienki-poludniowy-lacznik`, `osiedle-ddr-polnoc`, `osiedle-ddr-poludnie`, `pas-rowerowy-powisle`, `stadion-ddr-dojazd-polnoc`, `stadion-ddr-dojazd-wschod`, `stadion-ddr-dojazd-zachod`, `stadion-ddr-polnoc`, `stadion-ddr-poludnie`, `stadion-ddr-wschod`, `stadion-ddr-zachod`, `starowka-ddr-lacznik` | — |
| Przejazd dla rowerzystów | ✓ | `pod-palacem-przejazd`, `przejazd-przy-moscie` | — |
| Strefa zamieszkania / pieszych | ✓ | `deptak`, `kocie-lby`, `starowka-d40` | — |
| Wyjazd z drogi wewnętrznej | ✓ | `brama-podworko` | — |
| Przejazd kolejowy | ✓ | `mokotow-przejazd-bez-zapor`, `mokotow-przejazd-z-zaporami` | — |
| Pobocze, zakaz wjazdu rowerów | ✓ | `deptak-b9`, `lazienki-aleja-piesza`, `lazienki-znak-zakazu`, `pobocze-mokotow-polnoc`, `pobocze-mokotow-poludnie` | — |
| Kontraruch | ✓ | `kontraruch-b2-t22` | — |
| Nocna jazda | ✓ | `WAW-A2-05`, `dusk_at_s` | — |

| Moduł | Pokrycie | Reguły z mapy | Reguły z misji |
| --- | :---: | --- | --- |
| M01 | ✓ | `WYP-04`, `WYP-05`, `WYP-06` | `KASK-01`, `WYP-04`, `WYP-05`, `WYP-06` |
| M02 | ✓ | `GDZIE-01`, `GDZIE-02`, `GDZIE-03b`, `GDZIE-04`, `GDZIE-06`, `GDZIE-07`, `GDZIE-09`, `GDZIE-11` | `GDZIE-01`, `GDZIE-02`, `GDZIE-04`, `GDZIE-05`, `GDZIE-06`, `GDZIE-07`, `GDZIE-08`, `GDZIE-09`, `GDZIE-10`, `GDZIE-11` |
| M03 | ✓ | `SYG-01`, `SYG-02`, `ZNAK-A7`, `ZNAK-B1`, `ZNAK-B2T22`, `ZNAK-B9`, `ZNAK-C13`, `ZNAK-D1`, `ZNAK-S2`, `ZNAK-STOP` | `SYG-01`, `SYG-02`, `SYG-03`, `ZNAK-A7`, `ZNAK-B1`, `ZNAK-B2T22`, `ZNAK-C13`, `ZNAK-S2`, `ZNAK-STOP` |
| M04 | ✓ | `PIER-01`, `PIER-02`, `PIER-05`, `PIER-06`, `PIER-08`, `PIER-09` | `PIER-01`, `PIER-02`, `PIER-04`, `PIER-06`, `PIER-07`, `PIER-09` |
| M05 | ✓ | `MAN-01`, `MAN-02`, `MAN-03`, `MAN-06`, `MAN-08` | `MAN-01`, `MAN-04`, `MAN-07`, `MAN-08` |
| M06 | ✓ | `MSC-01`, `MSC-02`, `MSC-03`, `MSC-04` | `MSC-01`, `MSC-02`, `MSC-03`, `MSC-04`, `MSC-05` |
| M07 | ✓ | — | `PP-01`, `PP-02`, `PP-03`, `PP-04` |

**Pokrycie** 13/13 sytuacji, 7/7 modułów.

## Wieś i las

Mapa [wies.tmj](../maps/wies.tmj)

**Misje na mapie** `WIE-A1-01`, `WIE-A1-02`, `WIE-A2-01`, `WIE-A2-02`, `WIE-A3-01`, `WIE-A3-02`, `WIE-B-01`, `WIE-B-02`, `WIE-B-03`, `WIE-B-04`

| Sytuacja drogowa | Pokrycie | Wykryte obiekty lub misje | Brakujące elementy |
| --- | :---: | --- | --- |
| Skrzyżowanie równorzędne | ✓ | `lesne-skrzyzowanie` | — |
| Droga z pierwszeństwem + STOP | ✓ | `gminna-osada` | — |
| Sygnalizacja + S-2 + S-6/S-7 | ✓ | `przejazd-skansen`, `skansen-E-s1`, `skansen-N-s1`, `skansen-S-s1`, `skansen-W-s1`, `skansen-strzalka`, `skansen-tram-N-s1` | — |
| Rondo | ✓ | `rondo-E`, `rondo-N`, `rondo-S`, `rondo-W` | — |
| Tramwaj + przystanek bez wysepki | ✓ | `przystanek-skansen`, `tramwaj-skansen` | — |
| DDR, pas rowerowy, ciąg pieszo-rowerowy | ✓ | `ciag-lesny`, `ddr-las`, `ddr-zagrody`, `kontrapas-osady` | — |
| Przejazd dla rowerzystów | ✓ | `przejazd-skansen` | — |
| Strefa zamieszkania / pieszych | ✓ | `plac-osady` | — |
| Wyjazd z drogi wewnętrznej | ✓ | `wyjazd-gospodarstwo` | — |
| Przejazd kolejowy | ✓ | `przejazd-gminny` | — |
| Pobocze, zakaz wjazdu rowerów | ✓ | `piaszczysty-skraj`, `pobocze-wschod`, `pobocze-zachod`, `sciezka-rezerwatu`, `sciezka-rezerwatu-B-9-W` | — |
| Kontraruch | ✓ | `uliczka-osady-B-2-S` | — |
| Nocna jazda | ✓ | `WIE-A2-02`, `WIE-B-03`, `dusk_at_s` | — |

| Moduł | Pokrycie | Reguły z mapy | Reguły z misji |
| --- | :---: | --- | --- |
| M01 | ✓ | `WYP-04`, `WYP-05`, `WYP-06` | `KASK-01`, `WYP-04`, `WYP-05`, `WYP-06` |
| M02 | ✓ | `GDZIE-01`, `GDZIE-02`, `GDZIE-03b`, `GDZIE-04`, `GDZIE-06`, `GDZIE-07`, `GDZIE-09`, `GDZIE-11` | `GDZIE-03`, `GDZIE-03b`, `GDZIE-12` |
| M03 | ✓ | `SYG-01`, `SYG-02`, `ZNAK-A7`, `ZNAK-B1`, `ZNAK-B2T22`, `ZNAK-B9`, `ZNAK-C13`, `ZNAK-D1`, `ZNAK-S2`, `ZNAK-STOP` | `ZNAK-B1` |
| M04 | ✓ | `PIER-01`, `PIER-02`, `PIER-05`, `PIER-06`, `PIER-08`, `PIER-09` | `PIER-06` |
| M05 | ✓ | `MAN-01`, `MAN-02`, `MAN-03`, `MAN-08` | `MAN-08`, `MAN-13` |
| M06 | ✓ | `MSC-01`, `MSC-02`, `MSC-03`, `MSC-04` | `MSC-01`, `MSC-03`, `MSC-04` |
| M07 | ✓ | — | `PP-01`, `PP-03` |

**Pokrycie** 13/13 sytuacji, 7/7 modułów.

## Wrocław

Mapa [wroclaw.tmj](../maps/wroclaw.tmj)

**Misje na mapie** `WRO-A1-01`, `WRO-A1-02`, `WRO-A1-03`, `WRO-A1-04`, `WRO-A1-05`, `WRO-A1-06`, `WRO-A2-01`, `WRO-A2-02`, `WRO-A2-03`, `WRO-A2-04`, `WRO-A2-05`, `WRO-A2-06`, `WRO-A3-01`, `WRO-A3-02`, `WRO-A3-03`, `WRO-A3-04`, `WRO-A3-05`, `WRO-A3-06`, `WRO-B-01`, `WRO-B-02`, `WRO-B-03`, `WRO-B-04`, `WRO-B-05`, `WRO-B-06`, `WRO-B-07`

| Sytuacja drogowa | Pokrycie | Wykryte obiekty lub misje | Brakujące elementy |
| --- | :---: | --- | --- |
| Skrzyżowanie równorzędne | ✓ | `dworzec`, `ostrow`, `stadion` | — |
| Droga z pierwszeństwem + STOP | ✓ | `zachod-stop` | — |
| Sygnalizacja + S-2 + S-6/S-7 | ✓ | `poludnie-E-s1`, `poludnie-N-s1`, `poludnie-S-s1`, `poludnie-W-s1`, `poludnie-przejazd`, `poludnie-s2`, `poludnie-tram-E-s1`, `rondo-zoo-E-E-s1`, `rondo-zoo-E-S-s1`, `rondo-zoo-N-E-s1`, `rondo-zoo-N-N-s1`, `rondo-zoo-S-S-s1`, `rondo-zoo-S-W-s1`, `rondo-zoo-W-N-s1`, `rondo-zoo-W-W-s1`, `rynek-przejazd` | — |
| Rondo | ✓ | `rondo-hala-E`, `rondo-hala-N`, `rondo-hala-S`, `rondo-hala-W`, `rondo-zoo-E`, `rondo-zoo-N`, `rondo-zoo-S`, `rondo-zoo-W` | — |
| Tramwaj + przystanek bez wysepki | ✓ | `poludnie-przystanek-bez-wysepki`, `tramwaj-poludnie`, `tramwaj-stare-miasto` | — |
| DDR, pas rowerowy, ciąg pieszo-rowerowy | ✓ | `ciag-bulwary`, `ciag-zoo`, `ddr-bulwary`, `ddr-bulwary-hala`, `ddr-hala-wschod`, `ddr-hala-zachod`, `ddr-lacznik-hala`, `ddr-most-tumski`, `ddr-poludnie`, `ddr-poludnie-wschod`, `ddr-rynek-polnoc`, `ddr-rynek-poludnie`, `kladka-slodowa`, `kontrapas-nadodrze`, `mostek-japonski`, `pas-rowerowy-poludnie`, `sluza-poludnie` | — |
| Przejazd dla rowerzystów | ✓ | `bulwary-przejazd-hala`, `bulwary-przejazd-ostrow`, `bulwary-przejazd-zachod`, `hala-przejazd`, `hala-przejazd-bulwary`, `poludnie-przejazd`, `rynek-przejazd`, `rynek-przejazd-zachodni` | — |
| Strefa zamieszkania / pieszych | ✓ | `ostrow-d40`, `plac-solny`, `rynek-deptak` | — |
| Wyjazd z drogi wewnętrznej | ✓ | `wyjazd-magazyn` | — |
| Przejazd kolejowy | ✓ | `zachod-kolej-bez-zapor`, `zachod-kolej-zapory` | — |
| Pobocze, zakaz wjazdu rowerów | ✓ | `pobocze-zachod`, `pobocze-zachod-powrot`, `zakaz-obwodnica`, `zakaz-obwodnica-B-9` | — |
| Kontraruch | ✓ | `ulica-nadodrze-B-2` | — |
| Nocna jazda | ✓ | `WRO-A1-05`, `WRO-B-01`, `dusk_at_s` | — |

| Moduł | Pokrycie | Reguły z mapy | Reguły z misji |
| --- | :---: | --- | --- |
| M01 | ✓ | `WYP-04`, `WYP-05`, `WYP-06` | `KASK-01`, `WYP-04`, `WYP-05`, `WYP-06` |
| M02 | ✓ | `GDZIE-01`, `GDZIE-02`, `GDZIE-03b`, `GDZIE-04`, `GDZIE-06`, `GDZIE-07`, `GDZIE-09`, `GDZIE-11` | `GDZIE-01`, `GDZIE-02`, `GDZIE-03b`, `GDZIE-04`, `GDZIE-05`, `GDZIE-06`, `GDZIE-07`, `GDZIE-08`, `GDZIE-09`, `GDZIE-11` |
| M03 | ✓ | `SYG-01`, `SYG-02`, `ZNAK-A7`, `ZNAK-B2T22`, `ZNAK-B9`, `ZNAK-C13`, `ZNAK-D1`, `ZNAK-S2`, `ZNAK-STOP` | `SYG-01`, `SYG-03`, `ZNAK-A7`, `ZNAK-B2T22`, `ZNAK-B9`, `ZNAK-D1`, `ZNAK-P23` |
| M04 | ✓ | `PIER-01`, `PIER-02`, `PIER-05`, `PIER-06`, `PIER-08`, `PIER-09` | `PIER-02`, `PIER-03`, `PIER-04`, `PIER-05`, `PIER-08`, `PIER-09` |
| M05 | ✓ | `MAN-01`, `MAN-02`, `MAN-03`, `MAN-06`, `MAN-08` | `MAN-01`, `MAN-03`, `MAN-04`, `MAN-05`, `MAN-08`, `MAN-10` |
| M06 | ✓ | `MSC-01`, `MSC-02`, `MSC-03`, `MSC-04` | `MSC-01`, `MSC-02`, `MSC-04`, `MSC-05` |
| M07 | ✓ | — | `PP-01`, `PP-02`, `PP-03`, `PP-04` |

**Pokrycie** 13/13 sytuacji, 7/7 modułów.

## Zakopane

Mapa [zakopane.tmj](../maps/zakopane.tmj)

**Misje na mapie** `ZAK-B-01`, `ZAK-B-02`, `ZAK-B-03`, `ZAK-B-04`, `ZAK-B-05`

| Sytuacja drogowa | Pokrycie | Wykryte obiekty lub misje | Brakujące elementy |
| --- | :---: | --- | --- |
| Skrzyżowanie równorzędne | ✓ | `pod-reglami`, `u-podnoza` | — |
| Droga z pierwszeństwem + STOP | ✓ | `pod-krupowkami` | — |
| Sygnalizacja + S-2 + S-6/S-7 | ✓ | `dworzec-przejazd`, `przy-dworcu-E-s1`, `przy-dworcu-N-s1`, `przy-dworcu-S-s1`, `przy-dworcu-W-s1`, `przy-dworcu-strzalka`, `przy-dworcu-tram-N-s1` | — |
| Rondo | ✓ | `rondo-E`, `rondo-N`, `rondo-S`, `rondo-W` | — |
| Tramwaj + przystanek bez wysepki | ✓ | `przystanek-bez-wysepki`, `tramwaj-szkoleniowy` | — |
| DDR, pas rowerowy, ciąg pieszo-rowerowy | ✓ | `ddr-nad-potokiem-polnoc`, `ddr-nad-potokiem-poludnie`, `ddr-polnoc`, `ddr-poludnie`, `ddr-srodek`, `dojazd-do-krupowek`, `droga-za-potokiem`, `mostek-wschodni`, `mostek-zachodni`, `parking-kontrapas`, `sciezka-nad-potokiem` | — |
| Przejazd dla rowerzystów | ✓ | `dworzec-przejazd`, `las-przejazd`, `przejazd-nad-potokiem` | — |
| Strefa zamieszkania / pieszych | ✓ | `krupowki` | — |
| Wyjazd z drogi wewnętrznej | ✓ | `parking-wyjazd` | — |
| Przejazd kolejowy | ✓ | `kolej-przejazd` | — |
| Pobocze, zakaz wjazdu rowerów | ✓ | `alejka-lesna`, `alejka-lesna-B-9-N`, `pobocze-e`, `pobocze-w` | — |
| Kontraruch | ✓ | `parking-wyjazd-B-2-N` | — |
| Nocna jazda | ✓ | `dusk_at_s` | — |

| Moduł | Pokrycie | Reguły z mapy | Reguły z misji |
| --- | :---: | --- | --- |
| M01 | ✓ | `WYP-04`, `WYP-05`, `WYP-06` | `KASK-01`, `WYP-04`, `WYP-05` |
| M02 | ✓ | `GDZIE-01`, `GDZIE-02`, `GDZIE-03b`, `GDZIE-04`, `GDZIE-06`, `GDZIE-09`, `GDZIE-11` | `GDZIE-01`, `GDZIE-03`, `GDZIE-03b`, `GDZIE-11` |
| M03 | ✓ | `SYG-01`, `SYG-02`, `ZNAK-A7`, `ZNAK-B1`, `ZNAK-B2T22`, `ZNAK-B9`, `ZNAK-C13`, `ZNAK-D1`, `ZNAK-S2`, `ZNAK-STOP` | `ZNAK-B1` |
| M04 | ✓ | `PIER-01`, `PIER-02`, `PIER-05`, `PIER-06`, `PIER-08`, `PIER-09` | `PIER-05` |
| M05 | ✓ | `MAN-01`, `MAN-02`, `MAN-03`, `MAN-08` | `MAN-08` |
| M06 | ✓ | `MSC-01`, `MSC-02`, `MSC-03`, `MSC-04` | `MSC-04` |
| M07 | ✓ | — | `PP-01` |

**Pokrycie** 13/13 sytuacji, 7/7 modułów.

## Miasteczko (wspólny hub)

Mapa [miasteczko.tmj](../maps/miasteczko.tmj)

**Misje na mapie** `WAW-T-01`, `WAW-T-02`, `WRO-T-01`, `WRO-T-02`

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
| Nocna jazda | ✓ | `WAW-T-02`, `WRO-T-02`, `dusk_at_s` | — |

| Moduł | Pokrycie | Reguły z mapy | Reguły z misji |
| --- | :---: | --- | --- |
| M01 | ✓ | `WYP-04`, `WYP-05`, `WYP-06` | `KASK-01`, `WYP-04`, `WYP-05`, `WYP-06` |
| M02 | ✓ | `GDZIE-01`, `GDZIE-02`, `GDZIE-04`, `GDZIE-06` | `GDZIE-06` |
| M03 | ✓ | `SYG-01`, `SYG-02`, `ZNAK-A7`, `ZNAK-D1`, `ZNAK-S2`, `ZNAK-STOP` | `ZNAK-STOP` |
| M04 | ✓ | `PIER-01`, `PIER-02`, `PIER-05`, `PIER-06`, `PIER-07`, `PIER-09` | — |
| M05 | ✓ | `MAN-01`, `MAN-02`, `MAN-03`, `MAN-06` | — |
| M06 | ✓ | `MSC-01`, `MSC-02`, `MSC-03`, `MSC-04` | `MSC-04` |
| M07 | ✗ | — | — |

**Pokrycie** 7/13 sytuacji, 6/7 modułów.

## Plac manewrowy (M08)

Pokrycie reguł typu `plac` wymaga osobnego detektora ćwiczenia oraz geometrii w [plac.yaml](../content/plac.yaml).

| Reguła | Ćwiczenie | Pokrycie |
| --- | --- | :---: |
| `PLAC-01` | Ósemka | ✓ |
| `PLAC-02` | Slalom | ✓ |
| `PLAC-03` | Wąski tor | ✓ |
| `PLAC-04` | Zatrzymanie w wyznaczonym miejscu | ✓ |
| `PLAC-05` | Ruszanie z sygnalizacją | ✓ |
| `PLAC-06` | Jazda z jedną ręką (sygnalizowanie skrętu) | ✓ |
