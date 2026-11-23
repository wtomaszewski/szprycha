# 01 — Wizja i zakres

## Elevator pitch
**„GTA2 dla dzieci, w którym jesteś najlepszym kurierem w mieście — bo jeździsz najmądrzej.”**
Otwarte, pixel-artowe miasto z widokiem z góry, zlecenia od barwnych postaci, rywalizujący gang, sekrety do odkrycia, odznaki i rankingi. Szybkość się liczy, ale bezpieczna jazda liczy się bardziej — i to jest jedyna droga na szczyt.

## Dla kogo
- **Gracz:** dziecko 9–12 lat (klasa IV–VI), przygotowuje się do karty rowerowej lub dopiero zaczyna jeździć samodzielnie.
- **Rodzic:** chce, żeby dziecko się nauczyło, i chce mieć pewność, że gra jest bezpieczna (bez reklam, czatu, zbierania danych).
- **Nauczyciel techniki / WORD / policja:** szuka narzędzia na lekcję i do powtórki przed egzaminem (kody klas, raport trudnych przepisów).

## Filary projektu
1. **Akcja najpierw.** Każda misja to mała historia z celem, presją czasu lub wyzwaniem. Przepis jest przeszkodą/narzędziem w misji, nie tematem lekcji.
2. **Konsekwencja zamiast kary.** Stop-klatka pokazuje, co się stało, a Sierżant Ola podpowiada, jak poprawić przejazd. Po poważnym błędzie w kampanii można zacząć misję od początku.
3. **Mądra jazda się opłaca.** System punktów tak zbalansowany, że łamanie przepisów *zawsze* kosztuje więcej, niż daje skrót czy zyskany czas.
4. **Polska, ale z przymrużeniem oka.** Rozpoznawalne miejsca (PKiN, Stadion Narodowy, Rynek we Wrocławiu, Hala Stulecia), polskie realia (tramwaje, pasy, bloki, zapiekanki, gołębie), humor.
5. **Rozwój widoczny gołym okiem.** Rangi, mapa umiejętności, album znaków, rower i kask do personalizacji.
6. **Zgodność z egzaminem.** Każdy element egzaminu (teoria + praktyka na placu) ma odpowiednik w grze; egzamin próbny daje realną ocenę gotowości.

## Pętla rozgrywki
```
Odbierz zlecenie (SzprychaApp) → przygotuj rower (garaż: kask, światła) → jedź przez miasto
→ decyzje drogowe (pierwszeństwo, znaki, sygnalizacja) → wykryte dobre nawyki / błędy
→ dostarcz → wynik (punkty, gwiazdki, żetony) → odblokowania (dzielnice, kosmetyka, rangi)
→ nowe, trudniejsze zlecenia (które celują w Twoje najsłabsze przepisy)
```

## Tryby gry
| Tryb | Opis | MVP |
|---|---|---|
| Kampania miasta | Fabuła w 3 aktach na każde miasto | ✅ Warszawa i Wrocław |
| Wolna jazda | Otwarte miasto, zdarzenia losowe, kolekcje, wyzwania dzienne | ✅ |
| Plac manewrowy | Praktyczna część egzaminu jako wyścig/zręcznościówka | ✅ |
| Quiz „Mądra Głowa” | Szybkie serie pytań, system Leitnera | ✅ |
| Egzamin próbny „Licencja Szprychy” | Teoria + plac + przejazd po mieście, wynik zdany/niezdany | ✅ |
| Wyzwania czasowe | Najlepszy czysty przejazd trasy, rankingi | ✅ lokalne, online w M10 |
| Panel klasy | Nauczyciel tworzy kod klasy, widzi statystyki pseudonimów | M10 |

## Zakres MVP (wersja 1.0 web)
- 2 miasta (Warszawa, Wrocław), każde z 5 dzielnicami + wspólne Miasteczko Ruchu Drogowego (samouczek i plac).
- Na miasto: 3 akty × 5–6 misji fabularnych + 8 misji pobocznych + zdarzenia losowe.
- Wszystkie reguły z `content/przepisy.yaml` wykrywane w grze lub obecne w quizie.
- Bank ≥50 pytań (`content/pytania.json`), ≥40 znaków w Albumie.
- Offline PWA, PL, sterowanie klawiatura/gamepad/dotyk.

## Poza zakresem MVP
Multiplayer w czasie rzeczywistym, czat, konta z e-mailem, zakupy w aplikacji, inne miasta (lista planowana w `docs/05`), inne języki (struktura i18n gotowa).

## Mierniki sukcesu
- ≥80% graczy, którzy ukończą kampanię jednego miasta, zdaje egzamin próbny za 1. lub 2. podejściem.
- Średnia sesja 15–25 min, powrót do gry ≥3 razy w tygodniu w okresie przed egzaminem.
- Spadek liczby błędów w danej regule o ≥50% między pierwszym a piątym wystąpieniem sytuacji.
