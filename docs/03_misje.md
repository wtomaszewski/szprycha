# 03 — Misje

## Typy misji (archetypy)

| Typ | Mechanika | Napięcie | Czego uczy przy okazji |
|---|---|---|---|
| **Dostawa na czas** | Dojedź z A do B (lub A→B→C) przed upływem czasu | Timer, korki, światła | Pierwszeństwo, znaki, wybór drogi (DDR vs jezdnia) |
| **Delikatna przesyłka** | Pasek „wstrząsów” — gwałtowne hamowanie, krawężniki, kocie łby go napełniają | Precyzja | Płynna jazda, prędkość bezpieczna, wybór nawierzchni |
| **Wyścig z Turbo** | Rywal AI jedzie na skróty łamiąc przepisy | Kto zdobędzie więcej punktów, nie kto pierwszy | Że skróty się nie opłacają; wyprzedzanie, pierwszeństwo |
| **Pościg-pomoc** | Dogoń postać, która coś zgubiła (bez łamania przepisów) | Cel ucieka | Bezpieczne wyprzedzanie, omijanie, sygnalizacja |
| **Eskorta** | Jedziesz z Małym Frankiem / grupą AI, oni naśladują Ciebie | Twoje błędy powtarzają inni | Jazda w grupie, chodnik z opiekunem dziecka do 10 lat, sygnalizacja |
| **Detektyw znaków** | Znajdź i sfotografuj znaki (Album), wykryj znak, który „nie pasuje” | Szukanie, zagadka | Znaczenie znaków |
| **Przegląd przed jazdą** | Garaż: znajdź, czego brakuje w rowerze/stroju | Na czas, mini-gra | Wyposażenie obowiązkowe, kask |
| **Nocny kurs** | Misja po zmroku: bez świateł nie widać, a AI Cię nie widzi | Widoczność | Światła, odblaski, kamizelka |
| **Pogoda** | Deszcz/śnieg/silny wiatr | Zmiana przepisów w locie | Kiedy wolno jechać chodnikiem |
| **Pierwsza pomoc** | Scenka po upadku: kolejność działań w formie interaktywnej | Presja (spokojna) | Zabezpieczenie, 112, pozycja bezpieczna |
| **Plac manewrowy** | Tor zręcznościowy na czas z karami za błędy | Arcade | Praktyczna część egzaminu |
| **Konwój** | Prowadzisz kolumnę rowerów (max 15) | Koordynacja | Jazda w kolumnie, polecenia policjanta |

## Zdarzenia losowe w wolnej jeździe i misjach
Pojazd uprzywilejowany na sygnale · pieszy wchodzi na pasy · piłka wypada na jezdnię · drzwi auta otwierają się przed rowerzystą (zachowaj odstęp od zaparkowanych aut) · tramwaj podjeżdża na przystanek bez wysepki · dorożka na Starym Mieście · pawie/gołębie na ścieżce · roboty drogowe (znak A-14, objazd) · kolega proponuje „podwózkę na bagażniku” · telefon dzwoni w trakcie jazdy (odbierz po zatrzymaniu = bonus „Mądra Głowa”) · rowerzysta AI jedzie pod prąd.

Każde zdarzenie ma `ruleIds`. System **podaje częściej zdarzenia związane z regułami o najniższym mastery** gracza (ważenie wg `docs/04 §5`).

---

## Schemat danych misji (`content/misje/<miasto>.yaml`)

```yaml
- id: WAW-A1-03
  miasto: warszawa
  akt: 1
  tytul: misje.WAW-A1-03.tytul          # klucz i18n
  zleceniodawca: pani_halina
  typ: dostawa_na_czas
  wymagania: { ranga_min: zoltodziob, misje_ukonczone: [WAW-A1-02] }
  start: { poi: warsztat_praga }
  cele:
    - { typ: dojedz, poi: bazar_praga, opis: misje.WAW-A1-03.cel1 }
    - { typ: odbierz, przedmiot: pierogi }
    - { typ: dojedz, poi: blok_haliny, limit_s: 180 }
  przesylka: { delikatna: false }
  warunki_porazki: [ czas_minal, major_x3 ]
  checkpointy: [ cp_bazar ]
  reguly_cwiczone: [ PIER-01, PIER-06, MSC-03, MAN-01 ]
  zdarzenia_wymuszone:
    - { typ: auto_z_prawej, przy: skrzyzowanie_rownorzedne_ks1, regula: PIER-01 }
  par_s: 140                               # czas na 3 gwiazdki
  min_dobre_nawyki: 4
  nagrody: { zetony: 30, xp: 400, odblokuj: [naklejka_pierogi] }
  dialog_start: dialogi.WAW-A1-03.start
  dialog_koniec: dialogi.WAW-A1-03.koniec
```

`zdarzenia_wymuszone` gwarantują, że każde dziecko w misji spotka sytuację uczącą daną regułę (nie zostawiamy tego losowi).

---

## Lista misji MVP — WARSZAWA

| ID | Tytuł | Typ | Dzielnica | Reguły (główne) |
|---|---|---|---|---|
| WAW-T-01 | Witaj w Szprysze | samouczek | Miasteczko | sterowanie, KASK-01, ZNAK-STOP |
| WAW-T-02 | Przegląd u Kazika | przegląd | Miasteczko | WYP-01..05, KONTROLA-01 |
| WAW-A1-01 | Pierwszy kurs: klucze dla sąsiada | dostawa | Praga | PIER-01, MSC-03 |
| WAW-A1-02 | Bazar i bramy | dostawa | Praga | PIER-06, MAN-01, MAN-07 |
| WAW-A1-03 | Pierogi dla Pani Haliny | dostawa na czas | Praga | PIER-01, PIER-02, MAN-01 |
| WAW-A1-04 | Turbo rzuca wyzwanie | wyścig | Praga→Stare Miasto (most) | MAN-04, GDZIE-06, PIER-04 |
| WAW-A1-05 | Turyści na Starówce | delikatna przesyłka | Stare Miasto | GDZIE-07, GDZIE-05, MAN-08 |
| WAW-A1-06 | Błyskawica na znaku | detektyw znaków | Stare Miasto | ZNAK-*, SYG-03 |
| WAW-A2-01 | Części dla sygnalizacji | dostawa na czas | Śródmieście (PKiN) | SYG-01, SYG-02, PIER-09 |
| WAW-A2-02 | Zielona strzałka | wyzwanie | Śródmieście | ZNAK-S2, PIER-04 |
| WAW-A2-03 | Przystanek bez wysepki | dostawa | Śródmieście | MSC-02, PIER-09 |
| WAW-A2-04 | Delikatna przesyłka Profesora | delikatna | Powiśle (CNK) | GDZIE-01, GDZIE-08, MAN-04 |
| WAW-A2-05 | Nocny kurs bulwarami | nocny | Bulwary | MSC-04, WYP-04, WYP-05 |
| WAW-A2-06 | Detektyw na moście | detektyw | Most Świętokrzyski | GDZIE-01, GDZIE-02, ZNAK-C13 |
| WAW-A3-01 | Ulewa w Łazienkach | pogoda | Łazienki | GDZIE-04, GDZIE-05, GDZIE-09 |
| WAW-A3-02 | Z Frankiem do parku | eskorta | Łazienki/Mokotów | GDZIE-10, GDZIE-08, MAN-01 |
| WAW-A3-03 | Pociąg do kryjówki | dostawa | Przejazd kolejowy | MSC-01, MAN-04 |
| WAW-A3-04 | Turbo na czerwonym | pierwsza pomoc | Śródmieście | PP-01..04, SYG-01 |
| WAW-A3-05 | Klucz systemu | konwój | Łazienki→Stadion | MSC-05, SYG-03, PIER-07 |
| WAW-A3-06 | Rowerowe Święto | finał (wyścig punktowy) | Stadion Narodowy | wszystkie (miks) |

**Poboczne Warszawa (8):** Zapiekanka na gorąco (dostawa na czas) · Pawie mają pierwszeństwo? (Łazienki, piesi/zwierzęta) · Syreni skarb (kolekcja 10 syrenek — znaków-ciekawostek) · Neonowa noc na Pradze (nocny) · Kibice na moście (tłum, piesi) · Metro-sprint (dostawa wielopunktowa) · Kurier dla Kopernika 2 (delikatna) · Wyzwanie: Rondo ×5 bez błędu.

## Lista misji MVP — WROCŁAW

| ID | Tytuł | Typ | Dzielnica | Reguły (główne) |
|---|---|---|---|---|
| WRO-T-01 | Krasnal, który mówi | samouczek | Miasteczko → Rynek | sterowanie, KASK-01, GDZIE-06 |
| WRO-T-02 | Przegląd u Kazika (Wrocław) | przegląd | Miasteczko | WYP-*, KONTROLA-01 |
| WRO-A1-01 | Pierwsze krasnale | kolekcja | Rynek | GDZIE-07, GDZIE-05 |
| WRO-A1-02 | Kwiaty z placu Solnego | delikatna | Rynek | MAN-08, GDZIE-05 |
| WRO-A1-03 | Gołębi alarm | dostawa na czas | Rynek→Ostrów | PIER-04, GDZIE-06 |
| WRO-A1-04 | Zapałki dla Latarnika | dostawa na czas | Ostrów Tumski | PIER-02, MAN-03 |
| WRO-A1-05 | Kiedy zgasną latarnie | nocny | Ostrów Tumski | MSC-04, WYP-04, WYP-05 |
| WRO-A1-06 | Most Tumski i kłódki | detektyw znaków | Ostrów/Wyspy | ZNAK-A7, ZNAK-D1 |
| WRO-A2-01 | Wokół Hali Stulecia | dostawa | Hala Stulecia | PIER-08 (rondo), GDZIE-01 |
| WRO-A2-02 | Karma dla pingwinów | delikatna | Zoo/Afrykarium | GDZIE-11 (ciąg pieszo-rowerowy), GDZIE-08 |
| WRO-A2-03 | Pociąg o 12:05 | dostawa na czas | Dworzec Główny | PIER-09, MSC-02, SYG-01 |
| WRO-A2-04 | W cieniu Sky Tower | wyzwanie | Południe | MAN-03, GDZIE-02, PIER-03 |
| WRO-A2-05 | Pas dla rowerów | detektyw | Południe | GDZIE-02, ZNAK-P23 |
| WRO-A2-06 | Ślady gangu | pościg-pomoc | Południe→Zachód | MAN-04, MAN-05 |
| WRO-A3-01 | Za przejazdem | dostawa | Zachód | MSC-01, GDZIE-03b |
| WRO-A3-02 | Obwodnica? Nie tędy! | wyzwanie | Zachód | GDZIE-09, ZNAK-B9 |
| WRO-A3-03 | Wiatr od Odry | pogoda | Bulwary | GDZIE-04 |
| WRO-A3-04 | Wielki Wyścig Odrzański | wyścig | Bulwary | MAN-04, GDZIE-08, PIER-05 |
| WRO-A3-05 | Upadek na bulwarze | pierwsza pomoc | Bulwary | PP-01..04 |
| WRO-A3-06 | Parada Krasnali | konwój/finał | → Rynek | MSC-05, SYG-03, wszystkie |

**Poboczne Wrocław (8):** 100 krasnali (kolekcja w wolnej jeździe, każdy krasnal = mini-zagadka drogowa) · Fontanna o zmroku (nocny) · Mostowy maraton (12 mostów, wąskie przejazdy) · Dworcowy kurier (wielopunktowa) · Kontraruch na Nadodrzu (B-2 + T-22) · Lody na Wyspie Słodowej (na czas) · Japoński Ogród (delikatna, piesi) · Wyzwanie: Rondo ×5 bez błędu.

## Wspólne — Miasteczko Ruchu Drogowego
- **Plac manewrowy:** PLAC-01 ósemka, PLAC-02 slalom, PLAC-03 wąski tor, PLAC-04 zatrzymanie w polu, PLAC-05 ruszanie i sygnalizacja, PLAC-06 jazda z jedną ręką (sygnalizowanie skrętu). Każdy element: brąz/srebro/złoto czasowe, ale tylko przejazd bez dotknięcia linii/pachołka i bez podparcia nogą się liczy.
- **Licencja Szprychy** — egzamin (docs/02 §Finał, docs/04 §6).

## Zasady projektowania misji (dla Codexa i projektantów)
1. Misja trwa 2–5 minut. Checkpoint co ~60 s jazdy.
2. Każda misja ćwiczy 1–3 reguły główne (`reguly_cwiczone`) i ma przynajmniej 1 `zdarzenie_wymuszone`.
3. Skrót łamiący przepisy musi istnieć w ~30% misji (pokusa!) i zawsze kosztować więcej niż daje (patrz `docs/04 §2`).
4. Pierwsza misja z nową regułą: Sierżant Ola zapowiada ją w 1 zdaniu *przed* sytuacją. Kolejne razy — bez podpowiedzi.
5. Rywal Turbo łamie przepisy widowiskowo, ale zawsze traci przez to punkty/czas (zatrzymuje go Ola, wjeżdża w korek, musi wrócić).
6. Misje celujące w słabe reguły: generator „Zlecenia Dnia” wybiera szablon misji i podmienia trasę tak, by przechodziła przez obiekty powiązane z regułą o najniższym mastery.
