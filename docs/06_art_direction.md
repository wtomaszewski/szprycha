# 06 — Kierunek artystyczny (pixel-art w stylu GTA2)

## 1. Styl w jednym zdaniu
**Widok z góry jak w GTA2 — płaska ziemia, budynki-bloki „wyrastające” w stronę kamery — ale w czystym, kolorowym, przyjaznym pixel-arcie, w większej skali i z czytelnymi detalami.** Mniej brudu i szarości niż w GTA2, więcej koloru i humoru.

## 2. Rozdzielczość i skalowanie
- Rozdzielczość logiczna: **640×360** (16:9). Skalowanie całkowite ×2 (1280×720), ×3 (1920×1080), ×4 (2560×1440). Na tabletach 4:3 — rozszerzamy widok w pionie (logicznie 640×480), nie rozciągamy.
- `pixelArt: true`, `roundPixels: true`, filtrowanie nearest. Zero rozmycia, zero skalowania niecałkowitego sprite'ów.
- **Kafel bazowy: 32×32 px.** Postacie i rowery: **24×24** (rower z kierowcą), piesi 16×16, auta 32×48–32×64, tramwaj 32×160 (segmenty 32×80, przegubowy).
- Kamera: domyślne przybliżenie pokazuje ~20×11 kafli; przy szybszej jeździe lekkie oddalenie (jak w GTA2) — max 25%, płynnie, krokami całkowitymi.

Sprite’y ruchu są rysowane w skali **1:1** w pikselach logicznych. Długości klatek rowerzysty, auta osobowego i całego tramwaju wynoszą odpowiednio **24, 48 i 160 px**. Daje to stosunki 2:1 oraz 3,33:1. Klatki dostawczaka, autobusu i pojazdów uprzywilejowanych mają 64 px długości. Przegub łączy dwie klatki tramwaju o długości 80 px każda.

Symulacja używa nominalnych wymiarów w metrach. Obrys auta w ruchu drogowym ma 4,5 × 1,8 m, pojazdu uprzywilejowanego 5,5 × 2,1 m, tramwaju 15 × 2,4 m, rowerzysty 1,8 × 0,64 m, a pieszego 0,5 × 0,5 m. Przy sprawdzaniu kolizji z graczem każdy wymiar jest dzielony przez `world.metersPerPixel`. Hamowanie, odstępy i zwalnianie przejść oraz skrzyżowań korzystają z przodu, tyłu i szerokości pojazdu. Mapy mają umowną skalę, więc fizyczny obrys może sięgać poza sylwetkę sprite’a.

## 3. Paleta (32 kolory, bazowa — `assets/palette.hex`)
```
#1a1c2c  głęboki granat (kontury, cienie nocne)
#333c57  asfalt ciemny
#566c86  asfalt
#94b0c2  beton jasny / chodnik
#f4f4f4  biel (pasy, linie)
#c2c3c7  kostka szara
#8b6d5c  kocie łby
#5a3a2e  ciemna cegła / ziemia
#a65e46  cegła (Barbakan, Ratusz, Katedra)
#d98a5a  tynk pomarańczowy (Zamek, kamienice)
#e8c39e  piaskowiec (PKiN, Dworzec)
#f0dca8  kremowy
#ffcd75  żółć (kamienice, światło lamp)
#ef7d57  pomarańcz
#b13e53  czerwień tramwaju warszawskiego / dachówka
#e43b44  czerwień (znaki, Stadion Narodowy)
#ffffff  biel czysta (Stadion, znaki)
#73eff7  cyjan (szkło jasne, woda w słońcu)
#41a6f6  błękit (znaki nakazu, woda)
#3b5dc9  niebieski (znaki informacyjne, tramwaj wrocławski)
#29366f  granat wody nocą
#38b764  zieleń trawy
#257179  ciemna zieleń drzew
#a7f070  jasna zieleń (liście, hełmy Katedry — patyna z #6ab08a)
#6ab08a  patyna miedzi
#3e8948  zieleń Mostu Tumskiego
#b86f50  drewno / ławki
#5d275d  fiolet (neony Pragi, noc)
#ff77a8  róż (neony, kwiaty)
#feae34  żółty znaków ostrzegawczych
#0099db  szkło wieżowców
#c0cbdc  stal / szkło matowe
```
Noc: nakładka multiply w odcieniu `#29366f` + addytywne źródła światła (latarnie, światło roweru, neony, okna).

## 4. Efekt 2.5D bloków (klucz do „wyglądu GTA2”)
GTA2 renderowało budynki jako bryły widziane z góry z perspektywą względem środka ekranu. Implementacja:
1. Każdy budynek w warstwie `blocks` = podstawa (prostokąt/poligon) + `height` (w piętrach, 1 piętro = 12 px wysokości wizualnej) + tekstury: `roof` (kafel dachu), `wall` (tekstura ściany 32×12 na piętro), opcjonalnie `landmarkId`.
2. Renderer rysuje **ściany boczne** jako czworokąty od krawędzi podstawy do krawędzi dachu, gdzie dach jest przesunięty o wektor `(środek_bloku − środek_kamery) × min(0.35, height × 12 px / wysokość_kamery)`. Domyślna wysokość kamery to 1100 px. Suwak F3 pozwala ją stroić w trakcie jazdy. Widoczne są tylko ściany odwrócone od środka ekranu — jak w GTA2.
3. Dach rysowany na samej górze, z cieniem rzucanym w stronę dolnego-prawego rogu (stały kierunek słońca).
4. Tekstura ściany mapowana pasami pięter; przy niskiej wydajności fallback: dach + jedna „zmiękczona” ściana od strony kamery + cień (tryb `blocks:lite`).
5. **Landmarki** (PKiN, wieże) składają się z kilku warstw-bloków o rosnącej wysokości (podstawa → kondygnacje → wieża → iglica), wysokość każdej warstwy liczy się od gruntu, a jej ściany zaczynają się na przesuniętym dachu warstwy poniżej.
6. Testowy Pałac Kultury w Miasteczku ma pięć zwężających się brył (4, 10, 18, 26 i 32 piętra). Dla pojedynczego bloku wysokość zmienia rozmiar widocznych fasad, a dach pozostaje jednym prostokątem.
7. Kafelki muszą idealnie pasować do siatki pikseli: przesunięcia zaokrąglane do pełnych pikseli logicznych, brak migotania przy ruchu kamery (testuj przy wolnym przesuwaniu).

## 5. Postacie i pojazdy
- **Rower gracza:** widok z góry, widoczny kask (kolor/wzór z personalizacji), ręce na kierownicy, nogi pedałujące (4 klatki), **animacja sygnalizowania ręką lewą/prawą** (ręka wyciągnięta w bok — musi być czytelna na pierwszy rzut oka!), obejrzenie się (głowa obraca się), zsiadanie i prowadzenie roweru (postać idzie obok). 16 kierunków prerenderowanych (nie obracaj pixel-artu w czasie rzeczywistym w finalnej wersji; placeholdery mogą).
- **Światła:** przednie białe (stożek światła nocą), tylne czerwone (może migać), odblask czerwony z tyłu błyska, gdy pada na niego światło auta.
- **Auta:** 6 typów (mały hatchback, sedan, kombi, dostawczak, taksówka, autobus miejski), pojazdy uprzywilejowane (karetka, straż, policja — z animacją sygnałów), dorożka konna (Warszawa), rowerzyści AI (3 warianty), hulajnoga elektryczna.
- **Tramwaje:** Warszawa — czerwono-żółte; Wrocław — niebiesko-białe/kremowe. Bez logotypów przewoźników.
- **Piesi:** 12 wariantów (dzieci, dorośli, seniorzy z laską, osoba z wózkiem dziecięcym, turysta z mapą, biegacz, pies na smyczy), animacja chodu 4 klatki × 8 kierunków.
- **Portrety dialogowe:** 64×64, 5 emocji, dla wszystkich postaci z `docs/02`.

### Stan sprite’ów uczestników ruchu

- Menu zapisuje lokalnie żółty, błękitny lub różowy kolor kasku. Rowerzysta 24×24 ma 16 gotowych kierunków, po cztery klatki pedałowania i prowadzenia, dwie fazy zsiadania oraz osobne pozy lewego i prawego gestu, także przy obejrzeniu się. Po zmroku włączone przednie światło rzuca stożek, a tylny odblask rozjaśnia się w wiązce nadjeżdżającego pojazdu.
- Cztery typy mniejszych aut są w atlasie 32×48, a dostawczak i autobus w 32×64. Każdy typ ma trzy malowania. Kierunkowskazy migają na podstawie `maneuver`, a światła stop reagują na hamowanie i zatrzymanie. Karetka, straż i policja mają animowane belki. Pozy i światła korzystają z tej samej próbki symulacji w jeździe i powtórce.
- Tramwaj ma dwa segmenty 32×80 z przegubem, który pozwala im ustawić się wzdłuż toru niezależnie. Czerwono-żółte malowanie jest używane w Miasteczku. Niebiesko-kremowe jest przygotowane dla map Wrocławia.
- Osiem wariantów pieszych 16×16 ma po cztery klatki chodu i osiem kierunków. Trzy warianty rowerzystów AI korzystają z 24×24, czterech klatek i 16 kierunków.
- `npm run assets:generate` odtwarza oryginalne atlasy z palety projektu. `assets/manifest.json` opisuje siatkę PNG oraz kolejność klatek potrzebną przy podmianie grafik.

## 6. Landmarki — specyfikacja wizualna (również jako prompty dla artysty/narzędzia AI)

Wspólny prompt bazowy: *„top-down pixel art building in the style of 1999 GTA2 but cleaner and more colorful, viewed straight from above with slight 3D extrusion of walls, 32px tile grid, limited 32-color palette, no text, no logos, readable silhouette”*.

| Landmark | Podstawa (kafle) | Wys. (piętra) | Rozpoznawalność — co MUSI być widać |
|---|---|---|---|
| **Pałac Kultury i Nauki** | 10×10 (+ skrzydła 4×6 po bokach) | warstwy: 4 / 10 / 18 / 26 + iglica | Schodkowa, symetryczna bryła z piaskowca `#e8c39e`, „attyki” (ząbki) na krawędziach każdej kondygnacji, zegar na 4 ścianach wieży, smukła iglica na szczycie. Z góry: koncentryczne kwadraty zwężające się ku środkowi. |
| **Stadion Narodowy** | 14×12 (owal) | 6 | Owalna misa, fasada w ukośne biało-czerwone pasy (`#ffffff`/`#e43b44`) „plecione”, dach jasny, w środku **iglica-maszt** z linami do krawędzi dachu (rozchodzące się linie jak szprychy — gra słów z nazwą gry!), zielona murawa widoczna przez otwór. |
| **Zamek Królewski** | 8×8 (pięciobok z dziedzińcem) | 4, wieża 9 | Pomarańczowy tynk `#d98a5a`, ciemnoczerwony dach, wieża zegarowa z zielonym hełmem na środku fasady od placu. |
| **Kolumna Zygmunta** | 1×1 (+ cokół 2×2) | 8 | Cienka kolumna, postać na szczycie (uproszczona sylwetka z krzyżem), cień daleko na placu. |
| **Barbakan** | 5×3 (półkole) | 3 | Ceglany `#a65e46`, okrągłe baszty z czerwonymi daszkami, blanki. |
| **Centrum Nauki Kopernik** | 10×8 | 3 | Ciemnoszara kanciasta bryła z „pikselowanymi” panelami fasady, obok srebrna kula planetarium, zielony dach-ogród. |
| **Most Świętokrzyski** | ~40×4 | pylon 14 | Jeden pochylony biały pylon, wachlarz lin, DDR wydzielona kolorem. |
| **Pałac na Wodzie** | 6×4 na wodzie | 3 | Biały klasycystyczny pałac, kolumny od strony stawu, odbicie w wodzie (animowane). |
| **Ratusz wrocławski** | 8×5 | 4, wieża 10 | Gotycka cegła, ostre szczyty schodkowe z ozdobnymi sterczynami, **zegar astronomiczny** (kolorowa tarcza) na fasadzie, smukła wieża. |
| **Katedra (Ostrów Tumski)** | 6×12 | 6, wieże 16 | Dwie ceglane wieże ze **spiczastymi zielonymi hełmami** `#6ab08a`, długa nawa. |
| **Most Tumski** | 12×3 | — | Zielony stalowy most `#3e8948`, kratownica, kolorowe kropki-kłódki na barierkach. |
| **Hala Stulecia** | 12×12 (koło) | 5–8 schodkowo | Betonowe koncentryczne pierścienie z pasami okien, kopuła z góry jak „tarcza strzelecka” z prześwitami, obok Pergola (półkole kolumnad) i cienka wysoka Iglica. |
| **Afrykarium** | 10×6 | 3 | Falisty, nowoczesny dach, duże przeszklenia z niebieskim odbiciem wody, rzeźba pingwina przy wejściu (własna). |
| **Sky Tower** | 6×6 + skrzydła | 40 (najwyższy blok mapy) | Smukła szklana wieża `#0099db`/`#c0cbdc`, schodkowe niższe skrzydła u podstawy. |
| **Dworzec Główny** | 20×5 | 3, wieżyczki 5 | Długa kremowa fasada „jak zamek”: wieżyczki, blanki, wysokie okna, zadaszone perony z tyłu. |
| **Stadion Wrocław** | 14×11 (prostokąt z zaokrągleniami) | 6 | Półprzezroczysta fasada-membrana, która nocą świeci zmieniającymi się kolorami (animacja palety). |

**Krasnale:** własne projekty 16×16, ~20 zawodów (rowerzysta, listonosz, kucharz, strażak, malarz…), każdy z jednym atrybutem rozpoznawczym. **Nie kopiujemy** istniejących rzeźb wrocławskich krasnali.
**Syrenki (Warszawa):** własna figurka-maskotka 16×16 z tarczą i mieczem w formie zabawnej, nie kopia pomnika.

## 7. Kafelki (tileset minimum)
Asfalt (zwykły, łatany, mokry), linie (ciągła, przerywana, P-10 zebra, P-11 przejazd rowerowy — czerwony/kratka, P-12, P-13 trójkąty, P-23 symbol roweru, strzałki), chodnik (płyty), kostka, kocie łby, krawężniki (z przejściami obniżonymi), DDR (czerwona nawierzchnia), trawa, żwir, pobocze, tory tramwajowe (w jezdni i na zieleni), tory kolejowe, zapory (animowane), woda (animowana 4 klatki), nabrzeże, schodki, piasek plaży miejskiej, liście jesienią, śnieg (wariant zimowy).

### Stan oprawy terenu i zabudowy

Miasteczko i Praga korzystają z własnego atlasu terenu. Generator map dobiera
warianty z deterministycznym ziarnem i wylicza warstwy `verge` oraz `curb`
z sąsiedztwa kafli. Krawężnik zaokrągla narożniki chodników. Dymki, światła
i uczestnicy ruchu są osobnymi elementami, a statyczne podłoże, oznakowanie
oraz cienie są zapisane w teksturach fragmentów mapy. Woda fontanny zmienia
klatkę co 280 ms.

| Obszar | Dostępna grafika proceduralna |
| --- | --- |
| Podłoże | Cztery warianty trawy, asfaltu, płyt chodnikowych, kostki, żwiru i czerwonej nawierzchni rowerowej. Tory w jezdni, zaokrąglone i obniżone krawężniki, cztery klatki wody. |
| Oznakowanie | Białe P-10, P-11, P-12, P-13, P-23, linie ciągłe i przerywane oraz strzałki dopuszczonych kierunków na pasach z ograniczonym wyborem. Czerwone tło wydziela przejazd, a jego granice wyznaczają dwa rzędy białych pól. |
| Zabudowa | Cztery materiały ścian, okna i witryny na pasach 32×12, papa, dachówka, miedź i piaskowiec. Gzyms, kominy, wywietrzniki, klimatyzatory i świetliki. Światło z północnego zachodu i schodkowo zmiękczone cienie. |
| Ulica | Drzewa, latarnie, ławki, kosze, słupki i wiaty rozmieszczone w warstwie `props`. Korony i osprzęt wysokich obiektów przesuwają się z kamerą. |

`roof` i `wall` wybierają materiał bloku, a identyfikator bloku ustala
warianty. Nazwy dachów i ścian oraz indeksy kafli są opisane w
`src/render/artFrames.ts`. `assets/manifest.json` podaje rozmiary, układ i
liczbę klatek do podmiany plików 1:1. Atlasy odtwarza `npm run assets:generate`,
Miasteczko `npm run map:generate`, a Pragę `npm run map:generate:warsaw`.

Znaki pionowe i portrety korzystają z dotychczasowych placeholderów. Osobne warianty mokrej i zimowej nawierzchni oraz pozostałe landmarki należą do kolejnych etapów. Kałuże i oświetlenie są osobnymi warstwami renderera.

Wzory oznakowania pochodzą z [załącznika nr 2 do rozporządzenia o szczegółowych warunkach technicznych dla znaków i sygnałów drogowych](https://eli.gov.pl/eli/DU/2019/2311/ogl).

## 8. Znaki drogowe
Sprite'y znaków 16×16 (na mapie) i 64×64 (Album, quiz, stop-klatka). Rysowane **wg wzorów z rozporządzenia** (kształt, kolor, piktogram) w pixel-arcie — muszą być jednoznacznie rozpoznawalne. Lista w `content/znaki.yaml`. W stop-klatce znak, którego dotyczy błąd, pulsuje.

## 9. UI i font
- Font: pikselowy, licencja OFL, **z pełnym wsparciem polskich znaków** (kandydat: *Pixelify Sans*; zweryfikuj glify ą ę ć ł ń ó ś ź ż Ą Ę Ć Ł Ń Ó Ś Ź Ż; alternatywa: własny bitmap font 8×8/8×12 wygenerowany w `tools/`).
- W lewym górnym rogu są punkty i mnożnik Serii Bezpieczeństwa, w prawym Uwaga Drogówki (trzy gwizdki i odczyt liczbowy) oraz zegar misji. Strzałka przy krawędzi pokazuje kierunek i odległość do celu. Ikony pauzy i SzprychaApp są przy dolnej krawędzi. Minimapa pozostaje opcjonalna.
- Kolory UI: granat `#1a1c2c` tło paneli, żółć `#ffcd75` akcent, biel tekst. Kontrast min. 4.5:1.

## 10. Efekty
Deszcz (ukośne piksele, kałuże odbijające światła), śnieg, mgła (gradient widoczności), noc (patrz §3), konfetti przy sukcesie, „UPS!” w komiksowej chmurce przy błędzie, świecący ślad przy combo ×3+, dym z kominów, gołębie podrywające się do lotu.


### Światło i efekty w grze

- Noc ma granatową warstwę multiply (`#29366f`). Atlas efektów ma stopniowane aureole latarni, stożek lampki roweru, podwójny reflektor pojazdu, neon, desenie opadów i gradient mgły. Światła są dodawane po przyciemnieniu sceny. Okna naświetlają osobne maski na tych samych rzutowanych fasadach. Pozycje neonów Pragi pochodzą z dekoracji mapy.
- Tylny odblask wzmacnia się, gdy rower znajdzie się tyłem w reflektorach, i krótko utrzymuje jasność, żeby uniknąć migotania na brzegu wiązki. Render świateł i powtórki bazuje na próbce symulacji.
- Misje wyznaczają opady i mgłę, a podgląd deszczu w pauzie pozwala zobaczyć refleksy w kałużach. Dym ma źródło w kominach, a gołębie startują, kiedy rowerzysta podjeżdża blisko. Konfetti pojawia się przy ukończeniu misji, a ślad świetlny podczas jazdy z serią ×3 lub wyższą.
- Ustawienie „Mniej efektów” i ograniczenie ruchu w systemie zatrzymują animację opadów, neonu i dymu, pozostawia gołębie na ziemi, pokazuje statyczne konfetti oraz zastępuje ruchomy ślad poświatą pod rowerem. Tryb uproszczony stosuje te same warianty, ogranicza liczbę detali i pomija emisję fasad. Latarnie, neony i reflektory nadal oświetlają scenę.
- Podgląd nocy w F3 służy do sprawdzania grafiki. Widoczność, pora symulacji i stan lampek używany przez detektory pochodzą z dotychczasowych danych symulacji.

Praga w dzień, w nocy i podczas deszczu, przed zmianą po lewej i po zmianie po prawej. [Zrzuty porównawcze](graphics-32-before-after.webp)
