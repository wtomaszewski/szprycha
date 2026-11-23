# 08 — UX, sterowanie, HUD, audio, dostępność

## Sterowanie
Dwa schematy (wybór w ustawieniach; domyślnie „Proste” na dotyku, „Klasyczne” na klawiaturze):
- **Proste:** rower jedzie w kierunku wychylenia joysticka/strzałek (względem ekranu), siła wychylenia = prędkość.
- **Klasyczne (jak GTA2):** góra/dół = gaz/hamulec, lewo/prawo = skręt względem roweru.

| Akcja | Klawiatura | Gamepad | Dotyk |
|---|---|---|---|
| Jazda / skręt | WASD / strzałki | lewa gałka | wirtualny joystick (lewa strona, pływający) |
| Hamulec | Spacja | B / RT | przycisk |
| Sygnalizuj w lewo / w prawo | Q / E | LB / RB | dwa przyciski z ikoną ręki (kciuk lewy przy joysticku, prawy po prawej) |
| Obejrzyj się | C | Y | przytrzymaj przycisk „oko” |
| Dzwonek | F | X | przycisk |
| Światła | L | D-pad góra | przycisk (auto-podpowiedź o zmroku) |
| Zsiądź / wsiądź (prowadzenie roweru) | X | A | przycisk „zejdź” (kontekstowo pulsuje przed przejściem) |
| SzprychaApp / mapa | Tab / M | Select | ikona telefonu |
| Pauza | Esc | Start | ikona |

Na tabletach przyciski większe (min. 56 dp), układ konfigurowalny (przeciągnij przyciski). Haptyka (Capacitor) przy błędzie i dobrym nawyku.

## HUD
- Lewy górny: punkty misji + mnożnik Serii (×1…×5).
- Prawy górny: Uwaga Drogówki (0–3 gwizdki), timer misji.
- Krawędź ekranu: **strzałka celu** (jak w GTA2), z odległością w metrach.
- Lewy dolny (opcja): minimapa z trasą.
- Ikony stanu: kask (zielony = zapięty), światła, pogoda, pora dnia.
- Podpowiedzi kontekstowe (pierwsze wystąpienia): mała ikonka nad graczem, np. dłoń przy zbliżaniu się do skrzyżowania z planowanym skrętem.

W czasie jazdy na ekranie są dwie ikony menu. Telefon otwiera SzprychaApp po zatrzymaniu. Pauza zawiera zmianę schematu sterowania, powrót na start, wyjście, jakość grafiki i deszcz. Na desktopie pasek skrótów jest dostępny w pauzie, a joystick i przyciski jazdy pojawiają się tylko na urządzeniach z dotykiem. Wskaźniki mają opisy dostępne dla czytników ekranu. Deszcz w pauzie jest ustawieniem oprawy.

### Liczniki przy światłach (#98)

Pikselowe wyświetlacze przy S-1, S-2, S-6 i światłach dla pieszych pokazują czas do najbliższej zmiany lampy, zaokrąglony w górę do pełnych sekund. Włączona strzałka S-2 ma osobne odliczanie do zgaśnięcia, a główne czerwone światło dalej odlicza czas do zielonego. Cyfry mają stały wygląd podczas całej fazy. Album Znaków przypomina, że liczniki występują tylko na części skrzyżowań i zawsze obowiązuje sygnał świetlny.

„Pokaż liczniki przy światłach” jest domyślnie włączone w ustawieniach zwykłej jazdy. Jazda w egzaminie próbnym ma osobną preferencję w menu pauzy, domyślnie wyłączoną. Ustawienie zapisuje się w profilu.

[Dzień przed zmianą](screenshots/98-przed-dzien.png) · [Dzień z licznikami](screenshots/98-po-dzien.png) · [Noc przed zmianą](screenshots/98-przed-noc.png) · [Noc z licznikami](screenshots/98-po-noc.png)

## Ekrany i przepływ
Boot → wybór profilu (do 4 profili lokalnych, avatar + nick z generatora) → Menu główne (Kampania / Wolna jazda / Plac / Mądra Głowa / Licencja / Warsztat / Album / Osiągnięcia / Ustawienia / Dla rodzica) → CityPicker (mapa Polski) → Miasto.
**Ekran wyników misji:** gwiazdki (animacja), punkty z rozbiciem (dobre nawyki, błędy, czas), 1 przepis „do zapamiętania”, przycisk „Jeszcze raz po 3 gwiazdki”.
**Strefa dla rodzica** (zablokowana prostym zadaniem matematycznym): postęp mastery w modułach, przepisy sprawiające trudność, limit czasu gry, włączanie rankingów online, eksport certyfikatu.

### Nieudana próba misji (#97)

Poważny błąd, koniec czasu, nadmierne wstrząsy przesyłki, przegrany wyścig lub błędna odpowiedź przy pełnej Uwadze Drogówki zatrzymują próbę. Pieczątce „OBLAŁEŚ!” towarzyszy krótki dżingiel syntezatora regulowany głośnością efektów. Na stop-klatce Sierżant Ola pokazuje przyczynę i podpowiada, co zrobić w następnej próbie. Przyciski pozwalają zacząć misję od początku lub wrócić do menu.

Opcja „Łagodniejszy napis po nieudanej próbie” w Strefie Rodzica zmienia pieczątkę na „Spróbuj jeszcze raz”. Przy systemowym lub włączonym w grze ograniczeniu efektów pieczątka jest statyczna.

[Stop-klatka przed zmianą](screenshots/97-przed.png) · [Ekran porażki](screenshots/97-po.png) · [Wariant łagodniejszy](screenshots/97-lagodny.png)

### Pierwsza jazda z Sierżant Olą (#96)

Nowy profil zaczyna w Miasteczku Ruchu. Samouczek zapisuje bieżący krok lokalnie i wznawia go po ponownym uruchomieniu. Gracz może użyć przycisku „Pomiń samouczek” lub otworzyć w menu głównym „Pomoc”, aby wznowić albo zacząć od początku. Wcześniej utworzone profile otwierają od razu menu.

Sierżant Ola prowadzi kolejno przez ruszanie, hamowanie, sprawdzenie za lewym ramieniem, sygnalizowane skręty, dzwonek, światła, prowadzenie roweru i zatrzymanie przed linią STOP. Następnie gracz poznaje wskaźniki HUD, otwiera SzprychaApp i pauzę. Podpowiedzi śledzą ostatnio używane wejście, także po przełączeniu między klawiaturą, dotykiem i gamepadem w trakcie lekcji.

Ruch AI i losowe zdarzenia są wyłączone na czas ćwiczeń. Nieudana próba daje wskazówkę do powtórzenia. Ćwiczenia nie zmieniają wyniku, Serii, Uwagi Drogówki, mastery ani rankingów. W SzprychaApp Ola pokazuje dwie misje szkoleniowe. Po ukończeniu przycisk „Wybierz miasto” prowadzi do kampanii, gdzie zaczynają się WAW-T-01 i WRO-T-01.

[Miasteczko przed zmianą](screenshots/96-miasteczko-przed.png) · [Samouczek na klawiaturze](screenshots/96-miasteczko-po.png) · [Samouczek na dotyku](screenshots/96-dotyk-po.png) · [Menu przed zmianą](screenshots/96-menu-przed.png) · [Pomoc w menu](screenshots/96-pomoc-po.png)

## Dialogi
Dymki z portretem 64×64, maks. 2 linijki, tap/klawisz = dalej, przytrzymanie = pomiń całość. Lektor odtwarza pakowane nagrania przez Web Audio i ma przełącznik w ustawieniach. Kwestie bez nagrania są wyświetlane jako napisy. Teksty z `content/dialogi/*.yaml`.

## Audio
- **Radio Szprycha FM 2.0** działa podczas jazdy. Przycisk FM przełącza na następną stację, a ustawienia pozwalają wybrać dowolną i zapisują wybór w profilu.
- **SFX:** dzwonek (kilka wariantów kosmetycznych), hamowanie, kocie łby, tramwaj (dzwonek tramwajowy!), zapory kolejowe (dzwonek przejazdu), syrena pojazdu uprzywilejowanego, sygnał dźwiękowy sygnalizatora dla niewidomych na przejściach, gołębie, pawie, „UPS!”, fanfara gwiazdek, odblokowanie.
- Placeholdery SFX generowane proceduralnie (jsfxr-podobny generator w `tools/`).
- Głośności oddzielnie: muzyka / efekty / lektor. Domyślnie muzyka 60%.

### Radio Szprycha FM 2.0 (#99)

| Stacja | Gatunek |
| --- | --- |
| Szprycha Hits | Pogodny chiptune |
| Nocne Bulwary | Lo-fi ze swingiem, miękkimi klawiszami i wolnym bitem |
| Dzwonek Talk | Lekki podkład i dżingle z poradami |
| Retro Arcade | Szybkie 8-bitowe arpeggia |
| Spokojna Jazda | Ambient z długim wybrzmiewaniem akordów |
| Dźwięki Miasta | Funk i disco 8-bit z synkopowanym basem |

Każda stacja ma dżingiel i sześć utworów po 24 takty. Ziarna w `src/audio/radio/catalog.ts` ustalają tempo, tonację i warianty motywów. Utwory mają intro, zwrotki, powracający refren, bridge i outro. Kompozytor układa progresje akordów, melodie, arpeggia, bas i perkusję z akcentami oraz swingiem. Syntezator stosuje tablice przebiegów, obwiednie ADSR i vibrato. Dzwonek Talk emituje istniejące porady przy włączeniu stacji i w przerwach między utworami. Lektor korzysta z istniejącego mechanizmu ściszania muzyki w trakcie wypowiedzi.

Build tworzy monofoniczne MP3 o częstotliwości próbkowania 24 kHz zgodne z WebView i przeglądarkami. Mikser Web Audio korzysta z tej samej częstotliwości, gdy przeglądarka ją obsługuje. FFmpeg kompresuje sygnał, normalizuje głośność zintegrowaną do **−21 LUFS** (pomiar sygnału mono odtwarzanego w stereo) i ogranicza szczyty przed kodowaniem do **−3 dBFS**. Web Audio dodaje echo i pogłos syntetyczny dobrane do stacji, ogranicza szczyty po zmiksowaniu i stosuje głośność oraz ściszanie pod lektora. Gra trzyma w pamięci bieżący i następny utwór. PWA zapisuje cały katalog w pamięci podręcznej, a paczka mobilna zawiera go lokalnie. Pochodzenie muzyki opisuje [rejestr licencji](../assets/LICENSES.md).

Wymagany jest FFmpeg z enkoderem `libmp3lame` na `PATH` do budowania gry i wygenerowania plików przy pierwszym odsłuchu w trybie deweloperskim. `npm run radio:previews` wymaga również Chromium dla Playwright i enkodera `libopus`. Polecenie zapisuje sześć 15-sekundowych próbek OGG w `test-results/radio-previews`, po jednej na stację. Każda próbka łączy dżingiel i fragment refrenu z tym samym echem i pogłosem co w grze. GitHub Actions udostępnia je w artefakcie `radio-previews`.

[Ustawienia dźwięku przed zmianą](screenshots/99-radio-przed.png) · [Dźwięki Miasta w ustawieniach](screenshots/99-radio-po.png)

## Dostępność
- Tryb dla daltonistów: znaki i sygnały rozróżniane także kształtem/ikoną, światła sygnalizatora z symbolem.
- Rozmiar tekstu (3 poziomy), lektor, wysoki kontrast HUD.
- Spowolnienie gry (75% / 50%) dla młodszych lub mniej sprawnych graczy — bez kary w punktach lokalnych; rankingi online liczą się tylko przy 100%.
- Wszystkie informacje dźwiękowe mają odpowiednik wizualny (ikona syreny przy krawędzi ekranu z kierunkiem).
- Brak migających efektów > 3 Hz (bezpieczeństwo fotosensytywne). Systemowe ograniczenie ruchu zatrzymuje animacje dekoracyjne deszczu, dymu, gołębi, konfetti i śladu. Stan ruchu drogowego oraz informacje w HUD pozostają dostępne.

## Wydajność i platformy
Docelowo 60 FPS na: Chromebook szkolny, Android średniej klasy sprzed 3–4 lat, iPad 9. generacji. Ekran w poziomie; na telefonie w pionie komunikat „obróć urządzenie”.
