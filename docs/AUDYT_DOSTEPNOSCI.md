# Audyt dostępności gry — wydanie 2/2, część 1/2

23.11.2026 · [Zgłoszenie #122](https://github.com/wtomaszewski/szprycha/issues/122)

## Lista kontrolna i wyniki

| Sprawdzenie          | Wynik                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ekrany DOM           | Playwright otwiera menu główne, wybór miasta, SzprychaApp, pauzę, dialog fabularny, stop-klatkę, „OBLAŁEŚ!”, wyniki misji, quiz, egzamin, Album Znaków, Mapę Umiejętności, Strefę Rodzica, Ustawienia, O grze, Pomoc, samouczek, Plac manewrowy, Osiągnięcia i Wyzwania dzienne. Skan axe sprawdza reguły WCAG A/AA. Asercje Playwright sprawdzają role, dostępne nazwy i polski język dokumentu. |
| Kontrast             | Axe sprawdza tekst tam, gdzie może wyliczyć tło. Asercje palety sprawdzają minimum 4,5:1 dla podstawowego tekstu, drugoplanowego tekstu i kolorów akcentów oraz 3:1 dla obramowań. Osobne pomiary obejmują obrys fokusu, ikonę HUD i strzałkę celu.                                                                                                                                               |
| Klawiatura i pad     | Tab i Shift+Tab przechodzą po widocznych kontrolkach. Testy sprawdzają kolejność, zawijanie fokusu w oknach modalnych i jego powrót po zamknięciu, także w zagnieżdżonym dialogu. Scenariusz pada przechodzi od menu do wyboru miasta, telefonu i ustawień pauzy.                                                                                                                                 |
| Czytnik ekranu       | Testy sprawdzają nazwy i opisy w drzewie dostępności Chromium. Punkty, zegar, prędkość i pozycja celu są dostępne na żądanie. Seria i Uwaga Drogówki zgłaszają zmianę wartości. Stop-klatka oraz „OBLAŁEŚ!” mają opis zawierający przyczynę i wskazówkę.                                                                                                                                          |
| Tekst 200%           | Testy podwajają rozmiar fontu bazowego i sprawdzają szerokość audytowanych dialogów. Przy widoku 844 × 390 sprawdzają podwojenie tekstu, przewijanie i dostęp do ostatniego przycisku w Ustawieniach i O grze.                                                                                                                                                                                    |
| Ruch, napisy i kolor | Testy uruchamiają osobno preferencję systemową i „Mniej efektów”. W obu wariantach pieczątka jest statyczna, a konfetti i automatyczna powtórka wyniku są wyłączone. Kwestie lektora i porady radia są dostępne wizualnie. Położenia lamp i znaki stanów odróżniają komunikaty także przy zaburzonym rozpoznawaniu kolorów.                                                                       |

Testy audytu są w [tests/e2e/accessibility.spec.ts](../tests/e2e/accessibility.spec.ts) i uruchamiają się w istniejącym zadaniu **Web quality**. Lokalnie można uruchomić sam audyt poleceniem `npm run test:e2e -- tests/e2e/accessibility.spec.ts`. Narzędzia axe są wyłącznie zależnościami testowymi. [Rejestr licencji](LICENCJE.md)

## Naprawione pozycje

- Tab wrócił do nawigacji po interfejsie jazdy. M otwiera telefon i po zamknięciu fokus wraca do przycisku, który go otworzył. Obrys w kolorze z palety obejmuje przyciski, odnośniki, pola i sekcje rozwijane. Pad ma widoczny fokus także po wcześniejszym użyciu myszy.
- D-pad i A obsługują menu i dialogi. D-pad zmienia także listy, suwaki i karty. Strefa Rodzica ma opcję złożenia kodu klasy padem.
- HUD dopowiada kierunek świata i odległość, a kask i światła mają widoczne oznaczenia stanu. W stop-klatce opis przyczyny korzysta z nazwy reguły. Napisy porady radiowej pozostają w regionie statusu.
- Tekst uwzględnia ustawienia przeglądarki dzięki jednostkom względnym. Wyniki misji przewijają treść dialogu i utrzymują przyciski przy dolnej krawędzi. Obramowania głównych kontrolek są jaśniejsze.
- Sygnał S-1 zmienia położenie aktywnej lampy. Sygnał zamkniętego przejazdu i przejścia ma dodatkową kreskę. „Mniej efektów” i preferencja systemowa zatrzymują pulsowanie sygnalizacji kolejowej, świateł pojazdów uprzywilejowanych i kierunkowskazów w grze. Stop-klatka zachowuje bazowy zoom.

## Odłożone i ograniczenia weryfikacji

- Osobny przegląd układu na najmniejszych telefonach, w tym safe area, mapy wyboru miasta i zagęszczenia HUD, pozostaje w otwartym zgłoszeniu [#111](https://github.com/wtomaszewski/szprycha/issues/111).
- Odczyt głosem na fizycznym urządzeniu wymaga próby z NVDA, VoiceOver lub TalkBack. Chromium potwierdza strukturę, nazwy, opisy i parametry regionów live. Gamepad API jest symulowane w testach. Weryfikacja fizycznego pada i mobilnych WebView wymaga sprzętu.
- Skan obejmuje interfejs DOM. Dla graficznych sygnałów na płótnie sprawdzono położenie i kształt na zrzutach. Pełna jazda oparta wyłącznie na czytniku ekranu wymaga osobnego projektu nawigacji po świecie gry.

## Zrzuty

| Sprawdzenie                  | Przed                                      | Po                                   |
| ---------------------------- | ------------------------------------------ | ------------------------------------ |
| Fokus i obramowania menu     | [Przed](screenshots/122-menu-przed.png)    | [Po](screenshots/122-menu-po.png)    |
| Tekst 200% w O grze          | [Przed](screenshots/122-tekst-przed.png)   | [Po](screenshots/122-tekst-po.png)   |
| Położenie aktywnej lampy S-1 | [Przed](screenshots/122-swiatla-przed.png) | [Po](screenshots/122-swiatla-po.png) |
