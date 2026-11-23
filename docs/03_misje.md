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

M4c udostępnia osiem zdarzeń z `ruleIds` oraz wymuszane ćwiczenie STOP. Pieszy, tramwaj i pojazd uprzywilejowany korzystają z tras i zachowań M3b. Drzwi mają punkt mocowania na zaparkowanym aucie, piłka wtacza się na jezdnię, a rowerzysta pod prąd jest osobno oznaczonym zagrożeniem i hamuje przed graczem. Telefon można odebrać po bezpiecznym zatrzymaniu, a koledze odmówić podwózki. Odpowiedź działa przyciskiem komunikatu, klawiszem G lub przyciskiem Y pada.

| `typ` | `ruleIds` |
|---|---|
| `pojazd_uprzywilejowany` | `PIER-07` |
| `pieszy_na_pasach` | `PIER-04`, `PIER-10`, `MAN-08` |
| `pilka_na_jezdni` | `MAN-08` |
| `drzwi_auta` | `MAN-06` |
| `tramwaj_bez_wysepki` | `MSC-02` |
| `telefon_dzwoni` | `MAN-11` |
| `kolega_podwozka` | `MAN-10` |
| `rowerzysta_pod_prad` | `MAN-08`, `GDZIE-03` |
| `cwiczenie_stop` | `ZNAK-STOP` |

Losowanie używa ziarna i stałego kroku symulacji. Rozpatruje tylko zdarzenia pasujące do miejsca, w którym gracz jedzie. Domyślne wagi są równe. Funkcja `EventWeight` przyjmuje `ruleIds` i identyfikator zdarzenia, dzięki czemu M5 może zwiększać szanse na reguły o najniższym mastery. Ziarno i wagi wpływają wyłącznie na losowanie.

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
  warunki_porazki: [ czas_minal ]
  checkpointy: [ cp_bazar ]
  reguly_cwiczone: [ PIER-01, PIER-04, PIER-06, MSC-03, MAN-01 ]
  zdarzenia_wymuszone:
    - { typ: pieszy_na_pasach, przy: podejscie_do_zebry, regula: PIER-04 }
  par_s: 140                               # czas na 3 gwiazdki
  min_dobre_nawyki: 4
  nagrody: { zetony: 30, xp: 400, odblokuj: [naklejka_pierogi] }
  dialog_start: dialogi.WAW-A1-03.start
  dialog_koniec: dialogi.WAW-A1-03.koniec
```

`zdarzenia_wymuszone` gwarantują, że każde dziecko w misji spotka sytuację uczącą daną regułę (nie zostawiamy tego losowi).

### Uruchamianie misji

- `mapa` wskazuje plik Tiled bez rozszerzenia (domyślnie wartość z `miasto`). Samouczki używają `akt: 0`. `start.kask_zapiety` określa stan kasku przed ruszeniem, a `ruch_ai: false` pozwala przećwiczyć manewr bez ruchu AI.
- Cele są wykonywane kolejno, po osiągnięciu obszaru POI. `zbierz_obwarzanka`, `zbierz_bursztyn`, `zbierz_szyszke` i `zbierz_rogala` wymagają dojścia z rowerem do oznaczonej znajdźki i odpowiedzi na pytanie przypisane w warstwie `collectibles`. Zdobycz z profilu liczy się przy ponownym przejeździe. `odbierz` i `oddaj` bez własnego `poi` korzystają z ostatniego wskazanego POI. `wymagany_nawyk` wymaga werdyktu `good` dla wskazanej reguły w trakcie danego celu.
- `przygotuj_rower` może być pierwszym celem misji. Do jego ukończenia trzeba zapiąć kask i włączyć obie lampy. Pole `wymagana_kamizelka: true` dodaje kamizelkę do wyposażenia konkretnego ćwiczenia. `start.zmrok: true` ustawia warunki ćwiczenia.
- `skrot.odcinek` wskazuje strefę Tiled objętą znakiem B-1 lub B-2 bez wyjątku dla rowerów. Za jazdę rowerem przez tę strefę silnik wystawia zwykły werdykt zgodnie z wagą reguły. Podsumowanie misji informuje o nielegalnym przejeździe i odjęciu premii za czas. Prowadzenie roweru pozostaje dozwolone.
- `wyscig.trasa_rywala` wskazuje polilinię Tiled w warstwie `race_routes`. Wynik rywala uwzględnia werdykty z jego przejazdu. Do zaliczenia wyścigu trzeba zdobyć od niego więcej punktów.
- `przesylka.delikatna` włącza pasek wstrząsów. Szybka jazda po nierównościach, ostre hamowanie i uderzenie w krawężnik podnoszą jego poziom między odbiorem a oddaniem. Balans wyznacza progi premii za płynność i zakończenia próby.
- Cel `sfotografuj` wymaga zatrzymania w obszarze `poi` i naciśnięcia przycisku zdjęcia. Pole `znak` wskazuje obiekt Tiled w tym obszarze. Zdjęcie zalicza cel w bieżącej próbie misji.
- `checkpointy` to kolejność POI zapisujących pozycję oraz liczbę ukończonych celów. POI prostokątny używa środka do odrodzenia, a punktowy jest osiągnięty w promieniu 1,5 m. Opcjonalne `heading` w Tiled określa kierunek po odrodzeniu w radianach zgodnie z ruchem wskazówek zegara od osi +X.
- Cel `wybor` otwiera scenę po zatrzymaniu w danym POI. Zawiera klucze pytania, odpowiedzi i wyjaśnienia oraz identyfikator reguły. Zła odpowiedź zamyka drogę do kolejnego kroku i nalicza jedną karę za pytanie. Gracz może poprawić wybór, a czas przejazdu stoi podczas rozmowy.
- `start.ulewa` włącza ulewę na czas misji, a `start.awaria_swiatel` wygasza sygnalizację. `towarzysze` określa liczbę rowerzystów jadących śladem gracza w eskorcie lub konwoju.
- `limit_s` można podać dla całej misji lub dla etapu. Liczniki korzystają z czasu symulacji. Powrót do checkpointu po pominięciu wymaganego nawyku zachowuje zużyty czas obu limitów i wcześniejsze werdykty. Po porażce ponowienie tworzy nową próbę od `start.poi`, z początkowym wyposażeniem, zegarem, celami, zdarzeniami i wynikiem.
- `zdarzenia_wymuszone[].przy` wskazuje obiekt w `pois`, `triggers` lub `zones`. Build sprawdza typ zdarzenia, powiązanie z regułą i dostępność potrzebnej geometrii. Każdy wpis wyzwala się raz na próbę misji. Zajęte miejsce startu odkłada zdarzenie do kolejki. Nawigacja prowadzi do pominiętych wyzwalaczy przed ukończeniem ostatniego celu. Wyzwalacze działają również przy `ruch_ai: false`, które wyłącza ruch tła i losowanie w samouczku.

---

## Zlecenia dnia

SzprychaApp pokazuje trzy oferty w Wolnej jeździe oraz w kampanii po ukończeniu wszystkich głównych misji danego miasta. Dzień według lokalnego kalendarza, miasto i zapisane ziarno profilu wyznaczają losowanie. W pierwszej ofercie pierwszeństwo mają reguły o najniższej łącznej wartości mastery reguły i modułu. Pozostałe oferty są ważone mastery i mają inne archetypy oraz trasy.

Katalog powstaje podczas budowania gry na podstawie kierunkowego grafu pasów, ścieżek i punktów na mapach Tiled. Każdy odcinek i cała złożona trasa przechodzą symulację w silniku reguł, z kontrolą geometrii, kierunku, zatrzymania na STOP, świateł i zapór. Do katalogu trafiają wyłącznie przejazdy bez naruszeń. Zlecenia odbywają się bez losowych zdarzeń i ruchu tła, dzięki czemu gracz może odtworzyć sprawdzony przejazd. Przy przejściach wymagających prowadzenia roweru wskazówka w HUD przypomina o zsiadaniu.

Generator wybiera dostawę, odbiór, eskortę, fotografowanie znaku, zbieranie przedmiotów, wyścig punktowy lub delikatną przesyłkę. Zlecenia nocne zaczynają się od przygotowania kasku i świateł. Pierwszą pomoc ćwiczy się przy bezpiecznym postoju na podstawie pytań z banku gry. Opisy składają się z szablonów w `i18n/pl.json`, które podstawiają miejsce, przedmiot i nadawcę. Całość działa offline.

Premię czasową w Zleceniach dnia otrzymuje się za przejazd bez błędów. W wyścigu liczą się punkty, a naruszenie zasad kończy próbę. Oznaczony skrót pojawia się w podsumowaniu tak jak w M4d. Wynik Turbo ma pułap poniżej punktów gwarantowanych przez ukończenie legalnej trasy w czasie `par_s`. Ukończone zlecenia zasilają reputację oraz mastery. Zapis profilu i ranking kampanii zachowują osobne identyfikatory kampanii.

[SzprychaApp przed zmianą](screenshots/102-szprychaapp-przed.png) · [SzprychaApp ze Zleceniami dnia](screenshots/102-szprychaapp-po.png)

### Fikcyjni zleceniodawcy

Miasto i identyfikator startowego POI wyznaczają tego samego klienta niezależnie od dnia, profilu gracza i rodzaju zlecenia. Gdy punkt wraca w ofercie, wraca także klient. Imię, przydomek, zawód i cecha pochodzą z autorskich list w `content/zleceniodawcy.yaml`. Generator odrzuca wykluczone połączenia po ujednoliceniu wielkości liter, polskich znaków i separatorów. Postacie i ich wiek są fikcyjne.

SzprychaApp pokazuje imię, przydomek, wiek, zawód i cechę klienta. Dialog przed przejazdem i po ukończeniu zlecenia pokazuje jego portret. W Wolnej jeździe klienci czekają w pobliżu punktów startowych aktualnych ofert. Podczas zlecenia przy jego POI stoi wybrana postać. Katalog wyznacza miejsce poza jezdnią, trasami rowerowymi i przejściami. Jeśli punkt wypada na środku mostu, klient może czekać na brzegu.

[SzprychaApp przed i po](screenshots/103-telefon-przed-po.webp) · [NPC przy POI przed i po](screenshots/103-poi-przed-po.webp) · [Dialog ze zleceniodawcą](screenshots/103-dialog.webp)

### Wątki fabularne

Ukończenie zwykłego Zlecenia dnia bez naruszeń otwiera pierwszy wątek w danym mieście. SzprychaApp udostępnia po kolei „Zgubioną paczkę”, „Sąsiedzką pomoc”, „Przygotowania do festynu” i „Tajemniczy znak”. Każdy wątek składa się z 3–5 etapów. Wybór tras jest deterministyczny i zależy od ziarna zapisanego przy odblokowaniu. Zmiana dnia lub mastery nie zmienia trwającego wątku.

We wszystkich etapach wraca klient z punktu startowego pierwszego zlecenia. Opisy i dialogi pochodzą z szablonów i18n. Kolejne etapy mają różne cele, a sprawdzony legalny przejazd trwa w każdym z nich co najmniej 3 sekundy dłużej niż w poprzednim. Generator dobiera ćwiczenia z co najmniej trzech modułów. Naruszenie przepisów przerywa próbę. Pytania zadawane podczas postoju można poprawić przed dalszą jazdą.

Finał przyznaje 8–12 żetonów i naklejkę do kolekcji, raz na wątek w każdym mieście. Profil w wersji 10 zapisuje ziarno, liczbę ukończonych wątków i bieżący etap osobno dla Warszawy i Wrocławia. Migracja z wersji 9 dodaje pusty stan wątków i zachowuje dotychczasowe dane profilu.

[SzprychaApp przed zmianą](screenshots/104-szprychaapp-przed.png) · [SzprychaApp z odblokowanym wątkiem](screenshots/104-szprychaapp-po.png)

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

## Kampania — KRAKÓW

| Etap | Misje | Ćwiczenia |
|---|---|---|
| Szkolenie | `KRA-B-01` Wieczorny spacer po Rynku · `KRA-B-02` Kontrapas na Kazimierzu · `KRA-B-03` Pomoc na bulwarach | Przygotowanie roweru, B-9, kontrapas, osobna sygnalizacja rowerowa oraz bezpieczeństwo przy udzielaniu pomocy |
| Akt 1 | `KRA-A1-01` Zaproszenia pod Plantami · `KRA-A1-02` Obwarzanki z zagadką · `KRA-A1-03` Latarenka dla Smoka · `KRA-A1-04` Zdjęcia dla Oli · `KRA-A1-05` Koperta przez zebrę | Strefa zamieszkania, objazd B-1, zagadki, ostrożna jazda po kostce, zdjęcia znaków na postoju oraz prowadzenie roweru przez zebrę |
| Akt 2 | `KRA-A2-01` Plan Kazimierza · `KRA-A2-02` Boczne przejście · `KRA-A2-03` Dzwonek bez wysepki · `KRA-A2-04` Sygnał nad Wisłą · `KRA-A2-05` Znak przed rondem | Kontrapas, sygnalizacja, wysiadający pasażerowie, lampki po zmroku i pierwszeństwo na rondzie z A-7 |
| Akt 3 | `KRA-A3-01` Część zza torów · `KRA-A3-02` Pomoc dla Turbo · `KRA-A3-03` Objazd pod Kopcem · `KRA-A3-04` Klucz za STOP-em · `KRA-A3-05` Festyn bez zakłóceń | Pobocze i zapory, pierwsze kroki pomocy i symulacja rozmowy z 112, pełne zatrzymanie na STOP-ie, objazd B-1 i jazda w kolumnie |

## Kampania — GDAŃSK

| Etap | Misje | Ćwiczenia |
|---|---|---|
| Szkolenie | `GDA-B-01` Kładka przy Żurawiu · `GDA-B-02` Promenada w Brzeźnie · `GDA-B-03` Wiatr i piasek · `GDA-B-04` Zielone w stronę stoczni | Kask, światła, prowadzenie roweru przy B-9, pierwszeństwo pieszych na ciągu wspólnym, bezpieczeństwo po upadku, prędkość na piasku oraz S-6 |
| Akt 1 | `GDA-A1-01` Latarenki na Długi Targ · `GDA-A1-02` Bursztynowa układanka · `GDA-A1-03` Trzy błyski Żurawia | Delikatna dostawa po kostce i objazd B-1, trzy zagadki drogowe i prowadzenie roweru na kładce po zmroku |
| Akt 2 | `GDA-A2-01` Zapis sygnału · `GDA-A2-02` Przystanek nad Motławą · `GDA-A2-03` Wtyk zza torów | Sprawdzenie, czy przejazd rowerowy jest wolny, ustąpienie wysiadającym na przystanku bez wysepki, jazda poboczem i oczekiwanie na otwarcie zapór |
| Akt 3 | `GDA-A3-01` Obudowa na wietrze · `GDA-A3-02` Pomoc dla Turbo · `GDA-A3-03` Światło nad stocznią | Prędkość i objazd na zapiaszczonej drodze, bezpieczna reakcja po upadku i rozmowa z 112, przejazd kolumny otwartą alejką |

## Kampania — WIEŚ I LAS

Kampania i Wolna jazda używają tych samych identyfikatorów szkoleń. Po `WIE-B-01`–`WIE-B-04` SzprychaApp odblokowuje sześć misji głównych.

| Akt | Misje | Ćwiczenie |
| --- | --- | --- |
| 1 | `WIE-A1-01`–`WIE-A1-02` | Dostawa do szkoły prawym poboczem, odstęp przy wyprzedzaniu i trzy zagadki na dziedzińcu. |
| 2 | `WIE-A2-01`–`WIE-A2-02` | Postój i bezpieczny wjazd na niestrzeżony przejazd oraz powrót o zmroku w kasku, z lampkami i kamizelką. |
| 3 | `WIE-A3-01`–`WIE-A3-02` | Pierwsza pomoc przy drodze gruntowej, włączenie się do ruchu z gospodarstwa i objazd odcinka z B-1. |

## Kampania — POZNAŃ

Kampania uwzględnia ukończone szkolenia z Wolnej jazdy. Kolejne misje główne odblokowują się po przejściu poprzednich.

| Etap | Misje | Ćwiczenia |
| --- | --- | --- |
| Szkolenie | `POZ-B-01`–`POZ-B-04` | Strefa zamieszkania i objazd B-1, śluza rowerowa, ustąpienie pieszej na zebrze do wysepki, światła i pierwsza pomoc. |
| Akt 1 | `POZ-A1-01` Pudełko na Rynek · `POZ-A1-02` Trzy znaki na drewnie | Zapięcie kasku, dostawa z objazdem zamkniętego pasażu i trzy zagadki o strefie zamieszkania, zebrze i sygnalizowaniu skrętu. |
| Akt 2 | `POZ-A2-01` Trop przez zebrę · `POZ-A2-02` Plan przed światłami | Zatrzymanie i rzeczywiste ustąpienie pieszej idącej na peron. Dojazd do śluzy pasem i przejazd na zielonym. |
| Akt 3 | `POZ-A3-01` Światła na moście · `POZ-A3-02` Plansza na Ostrów | Kask i lampki o zmroku, bezpieczne podejście po upadku, wezwanie dorosłego i sprawdzenie reakcji oraz przeprowadzenie roweru chodnikiem przy B-9. |

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
