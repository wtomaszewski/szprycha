# Źródła i stan prawny

**Stan na: 21 listopada 2026 r.** Przed publikacją każdej wersji: przegląd zgodności z aktualnymi tekstami jednolitymi (ISAP — isap.sejm.gov.pl) i recenzja konsultanta (egzaminator WORD / policjant ruchu drogowego / nauczyciel prowadzący egzamin na kartę rowerową).

## Akty prawne (źródła pierwotne)
1. **Ustawa — Prawo o ruchu drogowym** — zasady dla kierujących rowerem, pierwszeństwo, manewry, przejazdy, obowiązek kasku osób do 16 lat.
2. **Ustawa o kierujących pojazdami** — karta rowerowa (wiek, warunki uzyskania, kto wydaje).
3. **Rozporządzenie w sprawie znaków i sygnałów drogowych** — znaczenie znaków pionowych, poziomych, sygnałów świetlnych i poleceń osób kierujących ruchem. Wzory znaków (element aktu normatywnego) jako podstawa grafik.
4. **Rozporządzenie w sprawie warunków technicznych pojazdów oraz zakresu ich niezbędnego wyposażenia** — obowiązkowe wyposażenie roweru.
5. **Rozporządzenie w sprawie karty rowerowej / trybu egzaminu** (aktualne na dzień weryfikacji) — zakres i przebieg egzaminu.
6. **Podstawa programowa** — technika, klasa IV szkoły podstawowej (wychowanie komunikacyjne).

## Zmiany i projekty, które trzeba śledzić
- **Od 3 czerwca 2026 r.** osoby, które nie ukończyły 16 lat, kierując rowerem, rowerem z napędem elektrycznym, hulajnogą elektryczną lub UTO, muszą używać kasku ochronnego (źródło: komunikat Ministerstwa Infrastruktury, gov.pl, 03.06.2026). → reguła KASK-01.
- **Projekt reformy karty rowerowej** (MI, opisywany w mediach w październiku 2026; **nie jest obowiązującym prawem**): karta od 9 lat zamiast 10, brak obowiązku karty po ukończeniu 14 lat, nowe zasady jazdy pod opieką i po chodniku, **ogólnopolski publiczny bank pytań** i ujednolicone egzaminy (przygotowywane przez Centrum do Spraw Szkolenia i Egzaminowania ITS), karta w mObywatelu. → Gra musi umożliwić podmianę banku pytań i parametrów wieku w `content/` bez zmian w kodzie. Gdy bank zostanie opublikowany — import i mapowanie pytań na `ruleId`.
- Progi zdawalności egzaminu szkolnego (poradniki podają 80% teorii i 90% praktyki) — **zweryfikować** w aktualnym rozporządzeniu; w grze konfigurowalne w `balans.yaml`.

## Materiały dydaktyczne pomocnicze
KRBRD (krbrd.gov.pl), materiały WORD-ów dla szkół, programy profilaktyczne Policji, materiały do wychowania komunikacyjnego dla klas IV.

## Oznaczenia w treściach gry
- `weryfikacja: true` w `content/przepisy.yaml` = przepis sformułowany zgodnie z najlepszą wiedzą, ale wymaga potwierdzenia brzmienia/zakresu w akcie prawnym przez konsultanta przed wydaniem.
- Numery artykułów celowo nie są podawane dzieciom w grze. W danych są w polu `podstawa` jako wskazówka dla recenzenta — do zweryfikowania.
