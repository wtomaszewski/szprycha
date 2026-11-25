# Audyt dostępności gry — wydanie 2/2

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
- Tekst uwzględnia ustawienia przeglądarki dzięki jednostkom względnym. Wyniki misji przewijają treść i przyciski w jednym obszarze. Obramowania głównych kontrolek są jaśniejsze.
- Sygnał S-1 zmienia położenie aktywnej lampy. Sygnał zamkniętego przejazdu i przejścia ma dodatkową kreskę. „Mniej efektów” i preferencja systemowa zatrzymują pulsowanie sygnalizacji kolejowej, świateł pojazdów uprzywilejowanych i kierunkowskazów w grze. Stop-klatka zachowuje bazowy zoom.

## Odłożone i ograniczenia weryfikacji

- Odczyt głosem na fizycznym urządzeniu wymaga próby z NVDA, VoiceOver lub TalkBack. Chromium potwierdza strukturę, nazwy, opisy i parametry regionów live. Gamepad API jest symulowane w testach. Weryfikacja fizycznego pada i mobilnych WebView wymaga sprzętu.
- Skan obejmuje interfejs DOM. Dla graficznych sygnałów na płótnie sprawdzono położenie i kształt na zrzutach. Pełna jazda oparta wyłącznie na czytniku ekranu wymaga osobnego projektu nawigacji po świecie gry.

## Zrzuty

| Sprawdzenie                  | Przed                                      | Po                                   |
| ---------------------------- | ------------------------------------------ | ------------------------------------ |
| Fokus i obramowania menu     | [Przed](screenshots/122-menu-przed.png)    | [Po](screenshots/122-menu-po.png)    |
| Tekst 200% w O grze          | [Przed](screenshots/122-tekst-przed.png)   | [Po](screenshots/122-tekst-po.png)   |
| Położenie aktywnej lampy S-1 | [Przed](screenshots/122-swiatla-przed.png) | [Po](screenshots/122-swiatla-po.png) |

## Małe telefony

Emulacja dotyku w Chromium obejmuje 640 × 360 i 360 × 640 px, z asymetrycznymi marginesami na wycięcie ekranu i pasek gestów. Każdy rozmiar sprawdzono ze standardowym tekstem i zwykłym kontrastem oraz z bardzo dużym tekstem i wysokim kontrastem. Test otwiera quiz z B-2 i T-22, błędną odpowiedź, bramkę i ustawienia Strefy Rodzica, ustawienia gry, wybór miasta, nocny HUD i długie wyniki misji.

Test mierzy rzeczywisty obszar dotykowy przycisków, list wyboru, suwaków i etykiet pól wyboru po przewinięciu. Każdy mieści się w obszarze bezpiecznym, ma co najmniej 44 × 44 px i odbiera dotyk w środku. Pomiary kontrastu porównują tekst, ikony i obrysy fokusu z pikselami ich tła na zrzucie. Najniższy odczyt wyniósł 6,66:1 w zwykłym kontraście i 15,77:1 w wysokim kontraście. Raport Playwright zapisuje odczyty dla każdego wariantu. [Zgłoszenie #111](https://github.com/wtomaszewski/szprycha/issues/111) · [Test Playwright](../tests/e2e/small-phone.spec.ts)

Zrzuty obejmują początek i koniec przewijanych wyników. Polecenie `UPDATE_SMALL_PHONE_SCREENSHOTS=1 npm run test:e2e -- tests/e2e/small-phone.spec.ts` odtwarza zrzuty. [Zrzuty małych telefonów](screenshots/male-telefony-111/)

## Nowe mapy

25.11.2026 · [Zgłoszenie #176](https://github.com/wtomaszewski/szprycha/issues/176)

| Obszar | Sprawdzenie i poprawki |
| --- | --- |
| Wybór mapy | Wolna jazda ma dziewięć pinezek, w tym Miasteczko ruchu. Kampania zawiera osiem miast. Test przechodzi po dziewięciu pinezkach klawiszem Tab także przy 844 × 390 px i tekście 200%. Powrót z wyboru mapy przenosi fokus na przycisk, który go otworzył. |
| Kolekcje | Gdańsk, Wieś i las, Poznań, Łódź oraz Zakopane mają nazwane liczniki w HUD-zie. SzprychaApp pokazuje też licznik i instrukcję zbierania. Scenariusze obejmują wybór miasta, otwarcie telefonu, zsiadanie, podejście do znajdźki, odpowiedź na zagadkę, komunikat o odpowiedzi i aktualizację licznika. Gdańsk sprawdzono klawiaturą, cztery pozostałe mapy padem przez symulowane Gamepad API. |
| Kampanie | Axe WCAG A/AA, nazwy i opisy, kolejność i zawijanie fokusu, kontrast palety oraz układ przy tekście 200% sprawdzono w rozmowach, zagadkach i wynikach misji. Stop-klatki obejmują wjazd na wiejski przejazd w trakcie przejazdu pociągu (MSC-01), wymijanie roweru cargo w Łodzi (MAN-14), przejście do wysepki w Poznaniu (PIER-10) i za szybki zjazd we mgle w Zakopanem (MAN-08). |
| Przejazdy kolejowe | Wiejski przejazd jest pasywny. Przed torami stoją A-10 z sylwetką lokomotywy i G-3 z krzyżem obrysowanym ciemną linią. Pociąg ma osobną sylwetkę na torach. Na aktywnym przejeździe w Warszawie znakiem ostrzeżenia jest jasny krzyż nad dwiema lampami. Przy „Mniej efektów” lampy świecą stale w fazie ostrzegawczej, co test sprawdza na dwóch klatkach. |
| Mgła i spadek | Na płótnie po lewej nad rowerem widać trzy poziome kreski oznaczające mgłę. Po prawej nad rowerem znajduje się ukośna strzałka ostrzegająca o spadku. Oba symbole są statyczne i mają jasny kształt na ciemnym tle. Test sprawdza ich położenie, piksele kształtów i kontrast. Preferencja systemowa wyłącza animację wyników, a „Mniej efektów” wyłącza też animację pieczątki nieudanej próby. |
| Zimny start i sklepy | Produkcyjna plansza PWA ma pusty tekst alternatywny. Komunikat o ładowaniu menu i pierwszej jazdy pojawia się w regionie `status`, a po załadowaniu znika. Materiały sklepowe #171 obejmują statyczne zrzuty i metadane. Audyt sprawdza też „O grze” oraz planszę PWA i pierwsze wejście do jazdy z #167. |

### Zrzuty przed i po

| Widok | Przed | Po |
| --- | --- | --- |
| Wybór mapy, 844 × 390 px | [Przed](screenshots/nowe-mapy-176/mapa-przed.png) | [Po](screenshots/nowe-mapy-176/mapa-po.png) |
| Podgląd kolekcji w SzprychaApp | [Przed](screenshots/nowe-mapy-176/kolekcja-przed.png) | [Po](screenshots/nowe-mapy-176/kolekcja-po.png) |
| Wiejski przejazd bez pociągu | [Przed](screenshots/nowe-mapy-176/kolej-wolna-przed.png) | [Po](screenshots/nowe-mapy-176/kolej-wolna-po.png) |
| Wiejski przejazd z pociągiem | [Przed](screenshots/nowe-mapy-176/kolej-zamknieta-przed.png) | [Po](screenshots/nowe-mapy-176/kolej-zamknieta-po.png) |
| Aktywny sygnał kolejowy i zamknięte zapory | [Przed](screenshots/nowe-mapy-176/kolej-sygnal-przed.png) | [Po](screenshots/nowe-mapy-176/kolej-sygnal-po.png) |
| Mgła i spadek w Zakopanem | [Przed](screenshots/nowe-mapy-176/mgla-zjazd-przed.png) | [Po](screenshots/nowe-mapy-176/mgla-zjazd-po.png) |
| Zimny start web przy wstrzymanym ładowaniu treści | [Przed](screenshots/nowe-mapy-176/start-przed.png) | [Po](screenshots/nowe-mapy-176/start-po.png) |

### Odłożone

- Fizyczny pad, odczyt komunikatów w NVDA, TalkBack lub VoiceOver i mobilne WebView wymagają prób na urządzeniach. Testy automatyczne sprawdzają nazwy i opisy w drzewie dostępności Chromium.
- Prowadzenie po świecie wyłącznie z czytnikiem ekranu pozostaje odrębnym zadaniem. Zrzuty i próbki pikseli obejmują wybrane sygnały na płótnie. Testy axe obejmują interfejs DOM.
