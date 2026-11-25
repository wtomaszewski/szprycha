# Postęp projektu

Stan na 25.11.2026.

| Kamień | Zakres                                      | Status                                                                                       |
| ------ | ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| M0     | Szkielet, menu, treści, narzędzia i CI web  | Ukończony — kontrole lokalne i GitHub Actions zielone                                        |
| M1     | Jazda, testowa mapa, kamera, bloki 2.5D     | Grywalny prototyp; lokalne kontrole zielone, test fizycznego Androida pozostaje do wykonania |
| M2     | Silnik zasad v1                             | Scalony w `main` w PR #13                                                                    |
| M3     | Ruch drogowy AI i pozostałe detektory       | Scalony w `main`. Ostatni PR to #21.                                                         |
| M4     | Misje i fabuła                              | Akt 1 Warszawy grywalny od samouczka do finału M4d (#25).                                    |
| M5     | Punktacja, progresja, zapis                 | M5a (#44), M5b (#46) i M5c (#54) w `main`.                                                   |
| M6     | Mapy Warszawy i Wrocławia                   | M6a–d: dwie mapy, dwie kampanie i wybór miasta. Raport strict obejmuje oba miasta.           |
| M7     | Plac, quiz, egzamin                         | Ukończony. Plac (M7a), quiz (M7b) i egzamin z Licencją (M7c).                                |
| M8     | Audio i szlif                               | Ukończony. M8a (#71), M8b (#72) i M8c (#73) w `main`.                                        |
| M9     | PWA, Capacitor, Android/iOS                 | Ukończony (M9a–M9c). PWA offline, układ mobilny oraz projekty Android i iOS.                 |
| M10    | Rankingi online i panel klasy (opcjonalnie) | Ukończony technicznie                                                                        |

## Ciągłość kampanii (#152)

- Po wynikach gra prowadzi do startu następnej misji lub treningu we wszystkich sześciu kampaniach. Przy zmianie mapy pokazuje przycisk przejścia. Zapis odtwarza prowadzenie po ponownym wyborze miasta.
- [Przebieg kampanii](docs/03_misje.md#przejście-do-następnej-misji-kampanii-152) i [obsługa nawigacji](docs/08_ux_sterowanie_audio.md#dojazd-do-następnej-misji-152).

## Łódź 2/2 — kampania (#140)

- „Nić do fabryki” zachowuje cztery szkolenia, dodaje siedem misji głównych w trzech aktach, cztery autorskie szpulki z zagadkami i przejazd kontrolny przez aleję.
- Główne misje ćwiczą M01–M07. Testy obejmują legalne przejazdy, nieopłacalne skróty, zapis kolekcji, scenkę pierwszej pomocy i dojazd do następnej misji. [Mapa, pomiary i zrzuty](docs/05_mapy.md#łódź)

## Łódź 1/2 — mapa (#139)

- Wolna jazda obejmuje Piotrkowską z rikszą i rowerem cargo, pofabryczne podwórka z muralami oraz aleję z neutralnym tramwajem i kontrapasem w bocznej uliczce.
- Cztery szkolenia `LOD-B-01`–`LOD-B-04` ćwiczą m.in. pierwszeństwo pieszych, bezpieczne wymijanie i ustępowanie przy bramie. Raport ścisły obejmuje 13/13 sytuacji i M01–M07. [Mapa, pomiary i zrzuty](docs/05_mapy.md#łódź)

## Zakopane 1/2 — mapa (#141)

- Wolna jazda obejmuje Krupówki, drewniane wille z Giewontem w tle, dwa mostki nad potokiem oraz dwukierunkową drogę o nachyleniu 12%.
- Pięć ćwiczeń `ZAK-B-01`–`ZAK-B-05` obejmuje zjazd, pobocze, jazdę we mgle, deptak i pierwszą pomoc. Raport ścisły obejmuje 13/13 sytuacji i 7/7 modułów. Kampania Zakopanego jest zakresem kolejnej części. [Mapa i weryfikacja](docs/05_mapy.md#zakopane)

## Poznań 2/2 — kampania (#138)

- Kampania „Trzy znaki na drewnie” zachowuje cztery szkolenia i dodaje sześć misji w trzech aktach, cztery drewniane rogale z zagadkami i przejazd kontrolny przez śluzę rowerową.
- Główne misje ćwiczą wszystkie moduły M01–M07. Testy sprawdzają legalne trasy, brak premii za niedozwolone skróty, zapis znajdziek, pierwszą pomoc i dziesięć minut ruchu dla trzech ziaren. [Mapa, pomiary i zrzuty](docs/05_mapy.md#poznań)

## Poznań 1/2 — mapa (#137)

- W Wolnej jeździe można wybrać Poznań ze Starym Rynkiem, południowym pokazem koziołków, Ostrowem Tumskim, bulwarem i dawnym browarem.
- SzprychaApp udostępnia cztery ćwiczenia `POZ-B-01`–`POZ-B-04`. Raport ścisły obejmuje 13/13 sytuacji i wszystkie moduły M01–M07. [Mapa, pomiary i zrzuty](docs/05_mapy.md#poznań)

## Wieś i las 2/2 — kampania (#128)

- „Mapa bez skrótów” zachowuje cztery szkolenia i dodaje sześć misji w trzech aktach, cztery znajdźki z zagadkami i wiejski przejazd kontrolny.
- Misje główne ćwiczą M01–M07. Testy obejmują bezpieczny przejazd przez tory, wyposażenie na zmrok, pierwszą pomoc, zakazany skrót i zapis szyszek. [Mapa, pomiary i zrzuty](docs/05_mapy.md#wieś-i-las)

## Wieś i las 1/2 — mapa (#127)

- Kolaż wsi jest dostępny w Wolnej jeździe. Obejmuje drogę gminną, odkryty przejazd kolejowy, przystanek regionalny, pole, las, gospodarstwo i mostek.
- SzprychaApp udostępnia cztery ćwiczenia `WIE-B-01`–`WIE-B-04`. Raport ścisły obejmuje 13/13 sytuacji i wszystkie moduły M01–M07, a testy sprawdzają cztery trasy oraz po dziesięć minut ruchu dla trzech ziaren. [Mapa, pomiary i zrzuty](docs/05_mapy.md#wieś-i-las)

## Gdańsk 2/2 — kampania (#126)

- „Trzy błyski nad Motławą” obejmuje cztery zachowane szkolenia i dziewięć misji głównych. Profil w wersji 12 zapisuje wybór Gdańska w kampanii i sześć autorskich bursztynów z zagadkami. Migracja zachowuje dotychczasowe postępy.
- Główne misje ćwiczą wszystkie moduły M01–M07, a CI sprawdza raport strict dla 13 sytuacji na mapie. Testy sprawdzają legalne trasy, przejazd egzaminacyjny i wynik trzech niedozwolonych skrótów. [Kampania, weryfikacja i zrzuty](docs/05_mapy.md#gdańsk)

## Wydanie 2/2 — audyt wydajności (#123)

- PWA mieści się w budżecie 8 MB. Warszawa, Wrocław, Kraków, Gdańsk, playlisty i nagrania lektora pobierają się przy użyciu i zostają w lokalnym cache. Miasteczko działa po pierwszej instalacji.
- Rozdzielono kod menu i jazdy, ograniczono pracę przy generowaniu podłoża i zwalniane są tekstury poprzedniego miasta. Na słabszym urządzeniu dotykowym działa automatyczny profil niski z ręcznym wyborem w pauzie.
- CI sprawdza rozmiar i czasy startu w Chromium. [Pomiary, budżety i odłożone pozycje](docs/AUDYT_WYDAJNOSCI.md)

## Gdańsk 1/2 — mapa (#125)

- W Wolnej jeździe można wybrać Gdańsk i przejechać kolaż obejmujący Długi Targ, Żuraw, stocznię, kładki i plażę. Cztery ćwiczenia `GDA-B-*` prowadzą przez kolejne odblokowania.
- Raport strict wykazuje 13/13 sytuacji i 7/7 modułów M01–M07. Testy obejmują dziesięć minut ruchu AI dla trzech ziaren oraz zapis odblokowań po przeładowaniu gry. [Mapa, weryfikacja i zrzuty](docs/05_mapy.md#gdańsk)

## Wydanie 2/2 — audyt dostępności (#122)

- Audyt ekranów DOM w Playwright i axe sprawdza nazwy, role, kontrast i fokus. Klawiatura i pad obsługują menu i dialogi, HUD ogłasza istotne zmiany, a tekst dialogów skaluje się do 200%.
- Ograniczono efekty ruchu i dodano oznaczenia stanów niezależne od koloru. [Raport, zakres i zrzuty](docs/AUDYT_DOSTEPNOSCI.md)

## Kraków 2/2 — kampania (#106)

- „Błyskawica nad Wisłą” ma trzy szkolenia i 15 misji głównych. Kampania działa na mapie z #105 i korzysta z dotychczasowych zapisów szkolenia oraz dzielnic. Profil w wersji 11 przechowuje także wybór krakowskiej kampanii i kolekcję.
- Siedem autorskich obwarzanków z zagadkami zapisuje się w profilu. Cztery oznaczone skróty dają gorszy wynik niż legalna jazda, także po doliczeniu premii za pytanie kontrolne.
- Raport strict w CI obejmuje 13/13 sytuacji i M01–M07. Testy sprawdzają wszystkie trasy kampanii oraz dziesięć minut ruchu AI dla trzech ziaren. [Kampania, mapa i weryfikacja](docs/05_mapy.md#kraków)

## Kraków 1/2 — mapa (#105)

- Kraków jest dostępny w Wolnej jeździe. Kolaż obejmuje Rynek, Wawel, Kazimierz, bulwary Wisły i Kopiec. Trzy ćwiczenia otwierają kolejne dzielnice, a raport strict sprawdza 13/13 sytuacji i 7/7 modułów M01–M07.
- Ruch AI obsługuje auta, tramwaj, pieszych i rowerzystę. Kampania Krakowa jest częścią [#106](https://github.com/wtomaszewski/szprycha/issues/106). [Mapa, weryfikacja i zrzuty](docs/05_mapy.md#kraków)

## Zlecenia proceduralne 3/3 (#104)

- Po pierwszym legalnym Zleceniu dnia SzprychaApp odblokowuje cztery wątki fabularne w każdym mieście. Każdy ma 3–5 etapów, jednego powracającego klienta i ćwiczenia z co najmniej trzech modułów.
- Postęp w mieście zapisuje się w profilu, a finał przyznaje żetony i naklejkę. Schemat profilu migruje do wersji 10. [Opis i zrzuty](docs/03_misje.md#wątki-fabularne)

## Radio Szprycha FM 2.0 (#99)

- Sześć stacji ma łącznie 36 deterministycznych utworów i sześć autorskich dżingli. Gra odtwarza wygenerowane podczas budowania pliki także offline. Podkład ścisza się pod lektorem.
- CI generuje sześć próbek OGG do odsłuchu. [Stacje, miks i polecenia](docs/08_ux_sterowanie_audio.md#radio-szprycha-fm-20-99)

## Zlecenia proceduralne 2/3 (#103)

- Zlecenia dnia mają fikcyjnych klientów przypisanych do POI w obu miastach. Wracają oni w kolejnych ofertach związanych z tym samym miejscem.
- SzprychaApp pokazuje profil klienta, mapa jego sprite, a dialogi portret 64×64. Generator składa twarz, fryzurę, dodatki i ubiór oraz obsługuje pięć emocji. [Opis i zrzuty](docs/03_misje.md#fikcyjni-zleceniodawcy) · [Galeria 24 postaci](docs/screenshots/103-galeria.png)

## Zlecenia proceduralne 1/3 (#102)

- SzprychaApp oferuje deterministyczne Zlecenia dnia dla Warszawy i Wrocławia w Wolnej jeździe oraz po kampanii miasta.
- Siedem archetypów korzysta ze sprawdzonych przejazdów po mapie, mastery M01–M07 i szablonów i18n. [Opis działania i zrzuty](docs/03_misje.md#zlecenia-dnia)

## Samouczek pierwszej jazdy (#96)

- Nowe profile rozpoczynają ćwiczenia z Sierżant Olą w Miasteczku Ruchu. Postęp jest zapisywany lokalnie, a samouczek można pominąć, wznowić lub powtórzyć z menu Pomoc.
- Samouczek uczy obsługi roweru i interfejsu na klawiaturze, dotyku i gamepadzie. Kampania Warszawy i Wrocławia zachowuje osobne misje szkoleniowe.

## Postacie i portrety (#101)

- Atlas 32×32 przedstawia gracza i rowerzystów AI w sześciu klatkach pedałowania. Gest skrętu i obejrzenie się mają pozy pośrednie.
- Atlas 24×24 zawiera dwanaście wariantów pieszych, zimowe kurtki oraz sześć klatek ruchu w ośmiu kierunkach. Każda postać fabularna ma pięć portretów 64×64. [Zrzuty i opis oprawy](docs/06_art_direction.md#stan-spriteów-uczestników-ruchu)

## Audyt grafiki (#100)

- Zrzuty Playwright obejmują trzy mapy w dzień, w nocy i podczas opadów, landmarki, ekrany gry oraz wariant dotykowy. Porównania i wyniki są w [raporcie audytu](docs/AUDYT_GRAFIKI.md).
- Atlasy własne uzupełniono o studzienki, liście, śnieg, wyposażenie ulic i ikony HUD. Poprawiono cienie, projekcję kondygnacji, czytelność B-20 i wybrane landmarki.
- Dalsze prace mają zgłoszenia [#108](https://github.com/wtomaszewski/szprycha/issues/108), [#109](https://github.com/wtomaszewski/szprycha/issues/109), [#110](https://github.com/wtomaszewski/szprycha/issues/110) i [#111](https://github.com/wtomaszewski/szprycha/issues/111).

## M9c — aplikacje Android i iOS

- Capacitor pakuje lokalny build gry i używa poziomego trybu pełnoekranowego. Ikony i splash pochodzą z generatora M9a.
- Aplikacja używa Preferences i przenosi istniejący profil z IndexedDB w tej samej WebView. PWA dalej zapisuje w IndexedDB.
- Opcjonalna haptyka rozróżnia błąd i dobry nawyk. Lektor wybiera zainstalowany polski głos systemowy, z lokalnym Web Speech w razie błędu lub braku głosu.
- CI składa niepodpisany debug APK i sprawdza jego uprawnienia. Dla iOS obejmuje synchronizację i walidację konfiguracji. Kroki Xcode i testy na urządzeniu są w [BUILD_MOBILE.md](docs/BUILD_MOBILE.md).

## M9b — układ mobilny

- Interfejs na telefonie i tablecie korzysta z bezpiecznego obszaru ekranu. Canvas dotykowy ma logiczną bazę 640×360 i rozszerza się do 640×480. Menu, HUD i dialogi zachowują rozmiary niezależne od skali canvasa.
- Sterowanie jazdą ma pola dotykowe co najmniej 44 px na telefonie i 56 px na tablecie. Układ przycisków można zamienić przeciąganiem lub wyborem dwóch pól, zresetować i zachować w lokalnym profilu.
- Rozmiar tekstu, wysoki kontrast i mniej efektów działają globalnie. Zrzuty interfejsu są w [docs/screenshots](docs/screenshots).
- W najcięższej z dwóch zmierzonych scen (Wrocław nocą, ulewa, do 17 aktywnych uczestników ruchu) CPU 4× dało 3,4 ms mediany i 5,2 ms p95 pracy na klatkę. Pomiar można powtórzyć poleceniem `npm run benchmark:mobile` przy uruchomionym podglądzie produkcyjnym na porcie 4174. Sprawdzenie na fizycznych urządzeniach opisuje instrukcja buildu mobilnego.

## M9a — PWA

- Manifest i service worker obejmują pełny build, w tym treści, mapy, atlasy i font. Proceduralne audio działa z kodu w pamięci podręcznej. Generator tworzy ikony i ekrany startowe z palety projektu.
- Po wykryciu nowej wersji gra wyświetla komunikat. Przejazd trwa dalej, a wersja zmienia się po zamknięciu wszystkich okien gry. Profil pozostaje w IndexedDB.
- Playwright w CI sprawdza warunki instalacji Chromium, przejazd offline i zapis po aktualizacji. Instrukcja instalacji jest w [BUILD_WEB.md](docs/BUILD_WEB.md).

## M8 — audio i szlif

- M8a dodało trzy stacje Radia Szprycha FM, proceduralne efekty dźwiękowe oraz polskiego lektora korzystającego z lokalnego głosu systemowego. Muzyka, efekty i lektor mają osobną regulację głośności.
- M8c zamyka misję ekranem wyników. Pokazuje gwiazdki, żetony, rozbicie punktów, dobre nawyki, opanowanie reguł i jedną wskazówkę. Gracz może powtórzyć misję, otworzyć SzprychaApp lub wrócić do mapy miast.
- Moment chwały odtwarza maksymalnie dwie sekundy zapamiętanych klatek przed potwierdzonym dobrym nawykiem. Przycisk „Pomiń animację” wyświetla od razu kadr z dobrym nawykiem. Przy ograniczeniu ruchu lub ustawieniu „Mniej efektów” ekran otwiera się ze statycznym kadrem. Ekran obsługuje klawiaturę, pad i dotyk oraz ma trzy rozmiary tekstu i wysoki kontrast. [Zrzut wyniku i momentu chwały](docs/screenshots/70-moment-chwaly.png)
- M8 korzysta z własnego kodu, grafiki z repozytorium i systemowego lektora. Instalacja PWA oraz paczki mobilne należą do M9.

### M8b — noc i pogoda

- Nocny kurs korzysta z przyciemnienia, stożka lampki i czerwonego odblasku reagującego na reflektory. Opcjonalna kamizelka daje premię WYP-06 podczas bezpiecznej jazdy po ciemku.
- Misje rozróżniają lekki deszcz, ulewę, śnieg i gęstą mgłę. W GDZIE-04 obowiązują wyjątki z danych przepisu, a GDZIE-05 nadal chroni pierwszeństwo pieszych. Hamowanie roweru korzysta z mnożników przyczepności w `content/balans.yaml`.
- Ustawienie „Mniej efektów” ogranicza ruch i kontrast efektów pogodowych. [Noc](docs/screenshots/69-noc.webp) · [Ulewa](docs/screenshots/69-ulewa.webp)

## M6d — kampania Wrocławia i wybór miasta

- Kampania prowadzi od dwóch samouczków przez trzy akty do Parady Krasnali. SzprychaApp zawiera siedem zleceń pobocznych, a w wolnej jeździe można zebrać 100 krasnali po rozwiązaniu ich zagadek.
- Menu Kampania i Wolna jazda otwierają mapę Polski z Warszawą i Wrocławiem. Profil w IndexedDB zapamiętuje ostatnie miasto i zachowuje wyniki obu kampanii.
- CI sprawdza `npm run coverage:maps -- --strict`. Oba miasta mają 13/13 sytuacji na mapie i 7/7 modułów ćwiczonych w misjach. [Raport](docs/coverage.md)
- Przejazdy testowe obejmują wszystkie zlecenia Wrocławia, a test przeglądarkowy sprawdza zmianę miasta, zapis po odświeżeniu i listę zleceń. [Mapa wyboru miasta](docs/screenshots/52-wybor-miasta.webp)

## M6c — Wrocław

- Kolaż pięciu dzielnic połączonych Bulwarami Odry jest dostępny w menu deweloperskim. Stan kolekcji 100 krasnali zapisuje się w profilu.
- Pokrycie wynosi 13/13 sytuacji i 6/7 modułów. Trzy symulacje ruchu po 10 minut obejmują dzień i noc, oba ronda oraz przejazdy tramwajów. [Raport](docs/coverage.md#wrocław)
- Misje Wrocławia, wybór miasta i wymaganie pełnego pokrycia modułów w CI są opisane w [M6d](https://github.com/wtomaszewski/szprycha/issues/52).

## Przygotowanie

- Rozpakowano zawartość nadrzędnego `szprycha/` do root; porównano bajty z ZIP-em przed jego usunięciem.
- Utworzono repozytorium Git. Pierwszy commit: `351da20` — `docs: dokumentacja projektu`.
- Źródłowe AGENTS.md, README.md, docs/, dydaktyka/ i content/ zachowane bez zmian; formatowanie ich nie dotyka.
- Przeczytano pełną dokumentację. Podsumowanie, konflikty, 20 reguł do recenzji i plan ograniczenia ryzyk: `NOTES_FOR_HUMAN.md`.

## M0 — wykonane

- Vite, Phaser 3.90.0, TypeScript strict, ESLint, Prettier, vitest, lockfile i Node 24 w `.nvmrc`.
- Boot czeka na lokalny font; Preload pobiera i waliduje dane; MainMenu wyświetla tytuł, pangram i informację o przyszłej kampanii.
- Pixelify Sans z OFL, glify polskich małych i wielkich liter sprawdzane na rzeczywistym pliku fontu; zrzut menu obejrzany.
- Polskie teksty UI w `i18n/pl.json`, ustawienia pixelArt/roundPixels i całkowity zoom logicznego ekranu 640×360.
- Ścisłe schematy zod wszystkich pięciu plików content; kontrola ID, odwołań i zagnieżdżonych warunków osiągnięć, indeksów odpowiedzi i zakresów balansu.
- Vite generuje `public/data/content.json` po walidacji zarówno w dev, jak i build; zmiana content powoduje restart dev. Błędy zatrzymują build. Loader przeglądarkowy waliduje ponownie.
- GitHub Actions: npm ci → lint → format → test → build → smoke Chromium; screenshot jako artefakt.

## Weryfikacja

- `npm ci` — czysta instalacja zależności z lockfile.
- `npm run lint` i `npm run format:check` — zielone.
- `npm test` — 8 testów zielonych, w tym rzeczywiste wywołanie `npm run build` na tymczasowej kopii ze złym ruleId (build poprawnie odmawia).
- `npm run build` — zielony, sprawdza też typy.
- `npm run test:e2e` — 2 testy zielone na serwerze `npm run dev`: przejście do menu oraz komunikat przy błędzie HTTP treści.
- `test-results/menu.png` — lokalny zrzut menu, nie jest wersjonowany.
- GitHub Actions — **zielone** dla commitu `02d271f`: [run PR](https://github.com/wtomaszewski/szprycha/actions/runs/44895919210) i [run push](https://github.com/wtomaszewski/szprycha/actions/runs/44895915338). Wszystkie kroki, także smoke Chromium, zakończone sukcesem na Ubuntu / Node 24.
- Pierwszy run ujawnił zależność testu od lokalnego katalogu public/. Naprawiono: test sam generuje poprawny JSON w tymczasowym katalogu przed wprowadzeniem błędnego ruleId.
- Kod wysłano do `wtomaszewski/szprycha`; [PR #1](https://github.com/wtomaszewski/szprycha/pull/1) jest roboczy, bez scalania do main.

## Uruchomienie

```sh
npm ci
npm run dev
```

Adres wypisuje Vite (domyślnie http://127.0.0.1:5173). Build: `npm run build`; podgląd builda: `npm run preview`.

```sh
npm test
npm run lint
npm run format:check
npx playwright install chromium
npm run test:e2e
```

## Ograniczenia zapisane przy zamknięciu M0 (historyczne)

- M1 nie rozpoczęto. Menu nie uruchamia jazdy; brak map, sterowania rowerem i renderera 2.5D. Nie implementowano silnika zasad ani quizu.
- Android/iOS i offline PWA należą do M9, nie do CI M0.
- Vite ostrzega o rozmiarze osobnego fragmentu Phasera (~1,2 MB przed gzip). Build przechodzi; optymalizacja zasobów świata nastąpi po ich dodaniu.
- Na oknach mniejszych niż 640×360 zachowujemy skalę 1:1 i przewijanie. Docelowe układy tabletów/telefonów są do realizacji w kolejnych etapach.
- Pięć opisów dla_dziecka przekracza deklarowane 160 znaków; zachowano treść, zgłoszono w notatkach, limit ten nie jest obecnie egzekwowany. Feedback ≤140 jest walidowany.

## M1 — grywalny szkielet mechaniki (pierwszy build; korekty poniżej)

Na prośbę użytkownika rozpoczęto następny etap, z priorytetem mechaniki. Obecna grafika nie została zaakceptowana; nie jest docelową oprawą gry.

- Przycisk „Rozpocznij jazdę próbną” i Enter otwierają scenę City; menu pozostaje dostępne z paska.
- Testowa mapa Tiled 80×60: drogi, chodniki, budynki, krawężniki, obniżone odcinki i punkt startowy. Warstwy przyszłej semantyki są przygotowane, ale detektorów reguł jeszcze nie ma.
- Model roweru w czystym TS: przyspieszanie, hamowanie, skręcanie, toczenie po puszczeniu gazu, prowadzenie roweru. Stały krok 1/60 s; kolizje sprawdzane małymi krokami, aby nie przenikać przez krawężniki. Niewielki skręt na postoju pozwala odjechać od przeszkody.
- Ściany blokują oba tryby. Krawężnik blokuje jazdę; można przeprowadzić rower albo skorzystać z obniżonego odcinka. To model zręcznościowy, nie implementacja przepisów.
- Kamera wyprzedza rower w kierunku jazdy. Renderer prostokątnych bloków przesuwa teksturowane dachy, rysuje ściany/piętra i cień; pełne piksele, culling, przeźroczystość dachu zasłaniającego gracza, przełącznik uproszczonego trybu.
- Klawiatura, ekranowy joystick i hamulec, Gamepad API; schematy Proste/Klasyczne, pauza, reset i czyszczenie wejścia po utracie fokusu. Zsiadanie i wsiadanie wymagają zatrzymania.
- Czytelniejszy interfejs jazdy w systemowej czcionce, polskie teksty w i18n. Generator PNG placeholderów i manifest assetów pozwalają podmienić grafikę.
- Testy: 15 vitest; 5 Playwright (menu, błąd danych, jazda/hamowanie/prowadzenie/pauza/powrót, joystick, symulowane API pada). Lint i build zielone. Fizycznego kontrolera nie testowano.
- Pomiar Chromium headless 1280×720, CPU 4×: 661 próbek, średnio 60,00 FPS, p95 16,8 ms, maksimum 16,8 ms. To pomiar krótkiej jazdy po mapie testowej na komputerze, nie dowód 60 FPS na fizycznym Androidzie. Pełny sprzętowy DoD M1 pozostaje otwarty.
- Reprodukcja: uruchom npm run dev, następnie npm run benchmark:driving. Raport trafia do test-results/performance.json. Generatory: npm run assets:generate i npm run map:generate (nadpisuje mapę treningową).
- M2 i dalszych etapów nie rozpoczęto. Brak AI, oceny przepisów, misji i punktów; plac nie nagradza łamania zasad. Docelowa grafika, animacje 16 kierunków, budynki wielowarstwowe/poligonalne i układy mobilne wymagają dalszego dopracowania.

### Korekta widoku M1 (historyczna; zastąpiona przeglądem poniżej)

Świat pomniejszony o 25% przez zoom 0,75, rower powiększony dla czytelności (na ekranie 1,5× względem poprzedniej wersji). Widoczny obszar jest szerszy i wyższy o około 33%. Poprawiono culling bloków dla oddalonej kamery.

## Przegląd M0/M1 — poprawki przed M2

- Canvas centruje wyłącznie CSS. Największa mieszcząca się skala całkowita dla bazy 640×360; rozmiar logiczny rozszerza się do okna (np. 1280×960 → 640×480 przy ×2). Reszta maks. 2 pikseli przy ×3 wynika z zaokrąglenia. Brak scrolla i dodatkowego przycisku pod canvasem; start przez dotknięcie pola w menu lub Enter.
- Kamera ma zoom 1, zastępujący wcześniejsze 0,75. Rower pozostaje powiększony ×2. Dla ekranu poniżej bazy logicznej używany jest mniejszy viewport przy ×1, bez obcinania canvasa.
- Telefon w pionie: „Obróć urządzenie” i zatrzymanie symulacji. HUD DOM używa Pixelify Sans i palety gry. Test telefonu 844×390 sprawdza sumę powierzchni panelu, joysticka i grupy przycisków ≤21%.
- Q/E, C, F, L i odpowiedniki pada/dotyku aktualizują RiderState: sygnalizacja ręką, oglądanie się, wizualny dzwonek, światła. Zsiadanie działa jak dotąd; krótkie akcje trwają podczas przytrzymania, światła są przełącznikiem. Dźwięk dzwonka pozostaje do M8.
- Bezpieczna obsługa KeyboardEvent kierowanego do window (target nie musi być Elementem). Test trzyma W 1 s i sprawdza wzrost prędkości.
- Krawężniki ograniczają prędkość jazdy do 40 px/s, ale przepuszczają rower; pieszo bez dodatkowego ograniczenia. Obniżenia nie spowalniają. Tylko ściany blokują ruch/wsiadanie. Chodnik jest przejezdny; detektor GDZIE-04 nadal do M2.
- Parametr wysokości k zwiększony z 0,015 do 0,03. Na wschód od startu (środek 928,1024) stoi testowy pałac: pięć zwężających się warstw 4/10/18/26/32, ostatnia jako iglica, piaskowcowe ściany. To uproszczona bryła do oceny paralaksy.
- Walidacja: 16 testów vitest, 12 Playwright, lint, format i build. M2 nie rozpoczęto; sprzętowy test Androida i finalna grafika pozostają otwarte.

### Ponowne oddalenie widoku

Na kolejną prośbę użytkownika kamera miasta ma zoom 0,75: widoczny obszar jest o około 33% szerszy i wyższy. Całkowite skalowanie canvasa i rozszerzanie viewportu pozostają; zoom kamery jest świadomym wyjątkiem od całkowitej skali świata. HUD zachowuje rozmiar.

## M2 — silnik zasad v1

- Testowe miasteczko ma kierunkowe pasy, DDR i osobny przejazd rowerowy, zebrę, dwa typy chodników, wloty równorzędne, A-7 i B-20 oraz cykl S-1/S-2. Generator odtwarza plik Tiled.
- Czysty TypeScript przelicza pozycje mapy na metry i ocenia dziesięć reguł M2 przy 60 tickach na sekundę. Warunkowy skręt S-2 ma własny werdykt. WYP-06 emituje wyłącznie pochwałę za dodatkowe odblaski. Epizody i tabela z docs/07 ograniczają powielone werdykty.
- F3 pokazuje geometrię stref, kierunki i klasy wlotów, fazy świateł, TTC i do dziesięciu ostatnich werdyktów. Jazda próbna pokazuje liczniki i jednozdaniowy dymek z treści reguły. Powrót na start rozpoczyna nową próbę z wyzerowanymi licznikami.
- W jeździe próbnej poruszają się auta i piesi na krótkich trasach treningowych. Ruch po sieci drogowej, pozostałe detektory i pełne zachowania uczestników należą do M3. Stop-klatka, powtórki i misje należą do M4, a punktacja i opanowanie reguł do M5.
- Kontrole lokalne obejmują 66 scenariuszy YAML, dodatkowe testy silnika, odtworzenie logu sterowania, lint, format, build i Playwright. Próba wolnej jazdy z zoomem 0,75 została wykonana w Chromium. Otwarte pozostają test na fizycznym Androidzie i konsultacja merytoryczna. Szczegóły w [NOTES_FOR_HUMAN.md](NOTES_FOR_HUMAN.md).

## M3a — graf pasów i auta AI

- W miasteczku jeździ 14 samochodów po grafie skierowanych polilinii Tiled. Graf waliduje odcinki, wloty, wyloty i skręty w czasie ładowania mapy i w buildzie.
- Samochody uwzględniają odstęp, B-20, S-1 i warunkowe S-2 oraz korzystają z tego samego `IntersectionManager` co gracz. Hamują przed rowerzystą i zajętą zebrą. F3 pokazuje graf, manewry i powody oczekiwania.
- Vitest sprawdza deterministyczność, walidację mapy, sygnały, hamowanie przed graczem i dziesięć minut ruchu 14 aut z kontrolą kolizji oraz postępu każdego pojazdu. Dotychczasowe scenariusze YAML zachowują własne dane uczestników.
- Trasy pieszych w miasteczku pozostają skryptowe. Symulacja pozostałych typów uczestników ruchu oraz reszta detektorów należą do kolejnych części M3.

## M3b — uczestnicy ruchu AI

- Piesi chodzą po chodnikach i korzystają z zebr z sygnalizacją oraz bez niej. Rowerzyści AI jeżdżą po DDR, pasie rowerowym i przy prawej krawędzi jezdni. Trasy i kontrolę przejazdów opisują dane Tiled.
- Tramwaj korzysta ze wspólnego rozstrzygania pierwszeństwa i obsługuje przystanek bez wysepki. Pojazd uprzywilejowany włącza niebieskie światła i syrenę, a auta zjeżdżają na prawo i czekają. F3 pokazuje uczestników i stan zdarzenia.
- Testy obejmują dwa 10-minutowe przebiegi wszystkich typów uczestników, deterministyczny reset i scenariusze YAML interakcji z graczem. PIER-07, PIER-09 i MSC-02 zostały podłączone do tych stanów w M3c. Zachowania oparte na SYG-02, PIER-04, PIER-05 i PIER-09 korzystają z listy do konsultacji w [NOTES_FOR_HUMAN.md](NOTES_FOR_HUMAN.md).

## M3c — pozostałe detektory

- PR #20 dodał 19 detektorów. Część 2 dodaje 18 detektorów, uzupełnia scenariusze i usuwa listę przejściową z testu pokrycia.
- Każda reguła ma jawny tryb oceny. GDZIE-10 i MSC-05 są w quizie, a warianty praktyczne wymagają misji z nadzorowaną eskortą lub pełną kolumną.
- Testy ruchu AI sprawdzają po 10 minut symulacji wszystkich uczestników dla dwóch ziaren. Kontrolują postęp, kolizje, wysiadanie i ustępowanie pojazdowi uprzywilejowanemu.
- Miasteczko dostarcza m.in. jezdnie, pas, przejazd z sygnalizacją rowerową i wloty A-7. Scenariusze uzupełniają je o warianty oznakowania, pobocza, strefę zamieszkania i polecenia kierującego ruchem. Oznakowanie dzielnic i zdarzenia misji, w tym prezentacja poleceń, należą do M4 i M6. Flagi merytoryczne pozostają do konsultacji.

## M4a — system misji (#22)

- Zod waliduje pliki `content/misje/<miasto>.yaml` i odwołania do tłumaczeń, reguł, map i POI podczas przygotowania buildu. `MissionSystem` pracuje w tym samym kroku 1/60 s co jazda i silnik zasad.
- Cele jazdy, odbioru i dostawy, limity misji i etapu, checkpointy, porażka po czasie lub po trzech werdyktach `major`. Powrót zachowuje czas i werdykty. Surowy wynik zawiera czas, `par_s`, dobre nawyki, werdykty i kwalifikację do premii za czas.
- WAW-T-01 dostępny z menu w Miasteczku. Ćwiczenie prowadzi od zapięcia kasku przez dojazd do skrzyżowania aż do mety po poprawnym zatrzymaniu na STOP. HUD pokazuje cel, kierunek, odległość i pozostały czas.
- Wyzwalacze zdarzeń działają na nazwanych strefach i POI. Dialogi, powtórka, biblioteka zdarzeń i trasy kampanii pozostają w M4b–M4d. Naliczanie punktów i gwiazdek należy do M5.

## M4b — dialogi i SzprychaApp (#23)

- Dialogi i postacie są danymi z `content/dialogi/`. Zod waliduje strukturę oraz powiązania z misjami, regułami i postaciami. Przy buildzie sprawdzane są też tłumaczenia oraz arkusze portretów 64×64 z pięcioma emocjami.
- WAW-T-01 ma dialog otwierający i końcowy po udanym przejeździe. Sierżant Ola zapowiada nowe reguły przed jazdą, po jednym zdaniu na regułę. Gra zapamiętuje zapowiedzi i zaliczone zlecenia lokalnie. Dialog obsługuje klawiaturę, pada i dotyk.
- SzprychaApp w HUD-zie pokazuje odblokowane zlecenia na bieżącej mapie. Otwarcie wymaga pełnego zatrzymania, a próba w ruchu wyświetla wskazówkę MAN-11. Pełny system progresji należy do M5.

## M4c — stop-klatka i zdarzenia (#24)

- „UPS!” pokazuje ostatnie 5 s ruchu gracza i agentów z bufora próbek przy 60 Hz. Stop-klatka wskazuje uczestnika, strefę lub znak, podaje jedno zdanie z bazy przepisów i pozwala wrócić do checkpointu. Podświetlenie pulsuje przy 2 Hz i respektuje ustawienie ograniczonego ruchu.
- Osiem zdarzeń drogowych i wymuszane ćwiczenie STOP w WAW-T-01. Losowanie jest deterministyczne i ma interfejs wag dla M5. Wymuszone zdarzenia działają także w misjach z wyłączonym ruchem tła.
- Testy pokrywają zawijanie i odtwarzanie historii, wszystkie zdarzenia headless, walidację powiązań z regułami, obsługę kolejki wymuszonej oraz przejazd WAW-T-01 w Chromium.
- Pomiar jak w M3a w Chromium headless (WebGL, 1280×720, CPU 4×, trzy przejazdy na wariant). Mediany średniej liczby klatek wyniosły 39,49 FPS na `main`, 39,12 FPS z historią 5 s i 38,79 FPS z pojedynczą próbką w tej samej implementacji. 95. percentyl czasu klatki wyniósł 33,4 ms dla wszystkich wariantów. Pomiar obejmował jazdę z pominięciem pauzy na lekcję i nie wykazał spadku FPS od zapisu historii. Wynik dotyczy środowiska headless.

## M4d — akt 1 Warszawy (#25)

- SzprychaApp prowadzi od WAW-T-01 do WAW-A1-06. Przegląd roweru i pierwsze kursy na Pradze pochodzą z PR #29. Most z DDR i Starówka dodają wyścig punktowy z Turbo, dostawę z paskiem wstrząsów oraz zdjęcie znaku prowadzące do pierwszej wskazówki Zakłócacza.
- Skróty są w dwóch z siedmiu zleceń: B-1 w WAW-A1-03 i B-2 w WAW-A1-04. Test na `content/balans.yaml` porównuje wyniki i maksymalny możliwy zysk czasowy po karze. Naruszenia są obsługiwane przez standardowe stop-klatki.
- Przejazdy headless obejmują cały akt. Playwright sprawdza kolejność odblokowania, stop-klatkę i wznowienie po B-1, wynik wyścigu, premię za płynność, zdjęcie i zapis ukończenia po przeładowaniu.
- Misje na fragmencie mapy są krótsze niż 2–5 min z docs/03. Trasy zostaną wydłużone w M6. Pełny Album Znaków, gwiazdki i progresja punktowa pozostają w M5.

## Grafika 2/3 — sprite’y uczestników ruchu (#31)

- Dodano atlasy rowerzysty i pieszych z gotowymi kierunkami, kolor kasku wybierany w menu, animowane światła pojazdów oraz tramwaj z dwoma segmentami. Wrocław ma przygotowane malowanie tramwaju do użycia na przyszłej mapie.
- Testy sprawdzają bajtową powtarzalność PNG, zgodność z manifestem, klatki kierunków i świateł oraz piksele obu gestów w scenie jazdy.
- Sprawdzono testowy Pałac Kultury i pojedyncze bloki o wysokości do 32 pięter. Schodkowa sylweta Pałacu wynika z pięciu brył zadanych w mapie.

## #37 — skala pojazdów i tramwaju

- Sprite’y ruchu korzystają z klatek atlasu w skali 1:1. Symulacja liczy obrysy, odstępy i zatrzymania z wymiarów w metrach, a kolizje z graczem wykorzystują skalę bieżącej mapy.
- Przesunięto przystanek bez wysepki w Miasteczku, przejście przy światłach na tej mapie oraz przejście przy bazarze w Warszawie, aby pojazdy mogły je zwolnić przed linią zatrzymania.
- Po dołączeniu #34 wyłagodzono łuki wjazdu i zjazdu z nasypu przy rondzie, żeby obrysy aut mieściły się na osobnych pasach.

## Grafika 3/3 — światło, pogoda i HUD (#32)

- Warstwa nocna z lampami, reflektorami, oknami i neonami, deszcz z kałużami, dym, gołębie, konfetti i ślad serii. Tryb uproszczony i statyczne warianty dla systemowego ograniczenia ruchu.
- HUD pokazuje punkty, serię, Uwagę Drogówki, stan wyposażenia, zegar i kierunek celu. Sterowanie i jakość grafiki można zmienić w pauzie. Punkty, seria, rekord i Uwaga Drogówki korzystają z progresji z #38. Rekord można sprawdzić w pauzie.
- Ustawienia deszczu i podgląd nocy działają w warstwie graficznej. Śnieg i mgła pozostają w zakresie późniejszego szlifu.

## M5 — progresja

- M5a dodał punktację, Serię Bezpieczeństwa, Uwagę Drogówki, gwiazdki i różnicowe nagrody za wynik misji. Testy porównują oznaczone skróty z legalnymi przejazdami.
- M5b przeniósł postęp z localStorage do IndexedDB i dodał XP, rangi, mastery, Mapę Umiejętności oraz lokalne rekordy. Werdykty są zapisywane partiami co 5 sekund symulacji i przy zdarzeniach cyklu życia.
- M5c rozszerza ten zapis o Album Znaków, osiągnięcia, trzy wyzwania dzienne od rangi Kurier oraz kolekcję naklejek. Zdjęcie z WAW-A1-06 trafia do Albumu. W wolnej jeździe można fotografować nowe znaki po zatrzymaniu poza jezdnią i zejściu z roweru.
- Wyzwania utrwalają zestaw na bieżący dzień lokalny. Pominięcie dnia nie wpływa na zdobyte nagrody. Kazik proponuje przerwę po 30 minutach aktywnej gry. Czas można zmienić w menu.
- Pełny Album wymaga znaków z kolejnych map. Wyzwanie tygodniowe miasta, przyszłe kolekcje oraz plac, quiz i egzamin będą dostępne wraz z odpowiednimi systemami w kolejnych etapach. Rankingi online pozostają w M10.

## M6a — Warszawa

- Generator dołącza Śródmieście, Powiśle z Bulwarami oraz Łazienki i Mokotów do istniejącej mapy z Pragi, mostu i Starówki.
- Warszawa obejmuje 13/13 sytuacji w [raporcie pokrycia](docs/coverage.md). Testy tras referencyjnych zachowują werdykty aktu 1. Dwie próby headless po 10 minut symulacji obejmują auta, tramwaj, pasażera, pieszych i rowerzystę.
- Misje na nowych odcinkach oraz ćwiczenia pierwszej pomocy pozostają w kolejnych częściach M6. Wrocław nie ma jeszcze osobnej mapy.

## M6b — kampania Warszawy (#50)

- Dwa samouczki i 18 zleceń głównych prowadzą od Pragi do finału na Stadionie Narodowym. Dodano dialogi, trasę finału, osiedlowe łączniki i wydłużone trasy aktu 1 z checkpointami.
- Warszawa ćwiczy moduły M01–M07. Nocny kurs zaczyna się od przygotowania kasku i świateł, a scena z Turbo uczy zabezpieczenia miejsca, wezwania pomocy i reakcji z dorosłym.
- Konwój rusza po awarii sygnalizacji i stosuje się do poleceń Oli. Oznaczony nielegalny skrót odbiera premię za czas zarówno graczowi, jak i Turbo.
- Zlecenia poboczne, plac i Licencja Szprychy pozostają w późniejszym zakresie. Scena pierwszej pomocy jest ćwiczeniem wyborów bez limitu czasu.

## M7a — plac manewrowy

- Plac dostępny z menu głównego i Miasteczka Ruchu Drogowego. Trening obejmuje wybrane ćwiczenie lub wszystkie sześć. W Arcade czyste przejazdy walczą o medale, a profil przechowuje czasy i odtwarza na torze najlepszy przejazd.
- PLAC-01…06 mają osobne detektory i testy scenariuszowe. Wynik to suma punktów ułamkowych z progiem 90%. Geometria, porady Sierżant Oli i balans są w danych, a po sesji gra zachęca do ćwiczeń na rowerze.
- `npm run benchmark:plac` mierzy płynność jazdy w Chromium z CPU 4× przy uruchomionym serwerze gry. Test Playwright zapisuje zrzut w `test-results/plac.png`. Raport pokrycia zawiera reguły typu `plac`.
- Weryfikacja kryteriów szkolnego egzaminu pozostaje otwarta.

## M7c — egzamin próbny i Licencja Szprychy (#61)

- Egzamin w menu łączy 25 pytań z quizu M7b, sześć elementów placu i trasę kontrolną w mieście ukończonej kampanii. W próbie generalnej Sierżant Ola omawia każdy element placu. Trening placu rozwija opanowanie M08.
- Po zaliczeniu finał odblokowuje rangę Legenda Szprychy i złoty dzwonek. Certyfikat można ponownie otworzyć z menu egzaminu, wydrukować lub zapisać jako PDF przez przeglądarkę. [Certyfikat](docs/screenshots/61-m7c-certyfikat.png)
- Build wykorzystuje pamięć offline M7b. Po pierwszym pobraniu zasobów test Playwright odcina sieć, przeładowuje stronę i sprawdza teorię, plac, przejazd, przyznanie nagrody, wydruk i ponowne otwarcie certyfikatu. Instalowalna PWA i platformy mobilne pozostają w M9.

## M10 — rankingi online i panel klasy

- M10a dodał Strefę Rodzica z bramką i lokalnym profilem. M10b dodał opcjonalny serwer rankingów, a M10c połączył go z grą, w tym z kolejką wyników offline i usuwaniem profilu.
- M10d dodaje osobny panel web pod `/nauczyciel.html`. Nauczyciel może utworzyć konto i klasy, zamknąć lub zmienić kod, wyzerować ranking i usunąć klasę albo konto. Etykiety nicków są zapisywane wyłącznie w przeglądarce nauczyciela.
- Rodzic zatwierdza dołączenie kodem w Strefie Rodzica. Członkowie widzą wygenerowane nicki, XP i opanowanie modułów. Rodzic może opuścić klasę także po wyłączeniu synchronizacji. Gra działa offline, a udział jest domyślnie wyłączony.
- Po resecie ranking klasy liczy przyrost względem ostatnich zsynchronizowanych wartości. Postęp w grze i rankingi publiczne działają dalej według własnych zasad.
- Do wydania pozostały decyzje o hostingu, domenach, obsłudze e-maili nauczycieli, deklaracjach sklepowych i publikacji dokumentów prawnych. [Lista dla wydawcy](NOTES_FOR_HUMAN.md#m10d--przed-wydaniem-panelu-nauczyciela-wojtek)
