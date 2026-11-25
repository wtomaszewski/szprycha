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
- **Rower gracza:** widok z góry, widoczny kask (kolor/wzór z personalizacji), ręce na kierownicy, nogi pedałujące (6 klatek), **animacja sygnalizowania ręką lewą/prawą** (ręka wyciągnięta w bok — musi być czytelna na pierwszy rzut oka!), obejrzenie się (głowa obraca się), zsiadanie i prowadzenie roweru (postać idzie obok). 16 kierunków prerenderowanych (nie obracaj pixel-artu w czasie rzeczywistym w finalnej wersji; placeholdery mogą).
- **Światła:** przednie białe (stożek światła nocą), tylne czerwone (może migać), odblask czerwony z tyłu błyska, gdy pada na niego światło auta.
- **Auta:** 6 typów (mały hatchback, sedan, kombi, dostawczak, taksówka, autobus miejski), pojazdy uprzywilejowane (karetka, straż, policja — z animacją sygnałów), dorożka konna (Warszawa), rowerzyści AI (3 warianty), hulajnoga elektryczna.
- **Tramwaje:** Warszawa — czerwono-żółte; Wrocław — niebiesko-białe/kremowe. Bez logotypów przewoźników.
- **Piesi:** 12 wariantów o różnych proporcjach i ubiorach. Wśród nich są dzieci, dorośli, seniorzy, osoba na wózku, osoba z psem, opiekun z wózkiem dziecięcym i turysta z mapą. Ruch ma 6 klatek × 8 kierunków.
- **Portrety dialogowe:** 64×64, 5 emocji, dla wszystkich postaci z `docs/02`.

### Stan sprite’ów uczestników ruchu

- Menu zapisuje lokalnie żółty, błękitny lub różowy kolor kasku. Rowerzysta 32×32 ma 16 gotowych kierunków, po sześć klatek pedałowania i prowadzenia oraz dwie fazy zsiadania. Ręka przechodzi przez pośrednią pozę przy wysuwaniu i chowaniu, a głowa obraca się w trzech fazach. Powtórka pokazuje fazę z zapisu. Po zmroku włączone przednie światło rzuca stożek, a tylny odblask rozjaśnia się w wiązce nadjeżdżającego pojazdu.
- Cztery typy mniejszych aut są w atlasie 32×48, a dostawczak i autobus w 32×64. Każdy typ ma trzy malowania. Kierunkowskazy migają na podstawie `maneuver`, a światła stop reagują na hamowanie i zatrzymanie. Karetka, straż i policja mają animowane belki. Pozy i światła korzystają z tej samej próbki symulacji w jeździe i powtórce.
- Tramwaj ma dwa segmenty 32×80 z przegubem, który pozwala im ustawić się wzdłuż toru niezależnie. Czerwono-żółte malowanie jest używane w Miasteczku. Niebiesko-kremowe jest przygotowane dla map Wrocławia.
- Atlas pieszych 24×24 zawiera stroje na cieplejszą pogodę i zimowe kurtki wybierane podczas śniegu. Osoba na wózku porusza obręczami kół. Trzy warianty rowerzystów AI korzystają z 32×32, sześciu klatek pedałowania i 16 kierunków. Rozmiary kolizji wynikają z dotychczasowej symulacji.
- Czternaście portretów 64×64 z `docs/02` pokazuje pięć emocji. Mimika zmienia ułożenie brwi, oczu i ust. Światło z górnej lewej strony podkreśla kształt twarzy, kasków i ubrań.
- `npm run assets:generate` odtwarza oryginalne atlasy z palety projektu. `assets/manifest.json` opisuje siatkę PNG oraz kolejność klatek potrzebną przy podmianie grafik.

[Porównanie postaci przed zmianą i po niej](screenshots/101-postacie-przed-po.webp)

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
| **Wawel** | 14×8 | 2–10 | Piaskowe skrzydła wokół dziedzińca, czerwone dachy, okrągła zielona baszta i złota kopuła. Pod zamkiem kamienny mur oporowy. |
| **Smok Wawelski** | 2×1 | — | Autorska patynowana figura na własnym owalu z piaskowca. Wyciągnięta głowa, rozpostarte trójkątne skrzydło i zawinięty ogon. |
| **Sukiennice i Rynek** | 12×4 | 4–6 | Podłużna piaskowa hala z ceglanym dachem i ząbkowaną attyką po obu długich stronach. Plac z kostki, szereg kamienic i dwie wieże kościoła Mariackiego o różnej wysokości. |
| **Kazimierz** | 5×3 (dom modlitwy) | 2–5 | Piaskowa bryła z wyniesionym szczytem, pobliskie ceglane i tynkowane kamienice oraz parterowy targ. |
| **Kopiec** | 8×4 | — | Zielone poziomice zbiegają się ku jasnemu głazowi na szczycie. Piaskowa ścieżka wije się po zboczu. |
| **Bulwary Wisły** | 40×6 | — | Rytm kamiennych schodów, ławek i latarni. Ceglasta DDR wzdłuż brzegu, jasna nawierzchnia na ciągu wspólnym. |
| **Żuraw nad Motławą** | 9×5 | 6–7 | Dwie ceglane wieże pod dwuspadowymi dachami obejmują ciemną drewnianą bramę. Węższy wysięgnik z pionowymi deskami wskazuje brzeg. |
| **Długi Targ** | 27×8 (pierzeja i plac) | 3–6 | Wąskie kamienice o schodkowym rytmie wysokości, środkowych kalenicach i dachach z czerwonej dachówki lub patynowanej miedzi. Autorska fontanna z zieloną figurą i kamienną misą. |
| **Stocznia** | 34×14 (hale i nabrzeże) | 3–4, dźwigi 137–170 px | Niskie hale w cegle i betonie. Zielonoszare sylwetki kratownicowych dźwigów, przeciwwaga, wysięgnik i hak. |
| **Brzeźno i kładki** | 41×16 (brzeg zatoki) | — | Jasny pas plaży i stopniowana linia piany, piaszczyste smugi na asfalcie. Drewniana kładka przy Żurawiu, stalowe kratownice przy stoczni. |

Rondo Kasztany wyznacza zielona wyspa, a podejścia do przejść serwisowych na Rynku, Kazimierzu i pod Kopcem wyróżnia pas kostki i znak B-1.

Tramwaje Krakowa i Gdańska mają srebrne pasy wzdłuż grafitowej bryły, ciemny dach i te same klatki przegubowe co pozostałe warianty. Grafika powstała z generatorów i kształtów w repozytorium, bez logotypów i barw przewoźnika.

**Krasnale:** własne projekty 16×16, ~20 zawodów (rowerzysta, listonosz, kucharz, strażak, malarz…), każdy z jednym atrybutem rozpoznawczym. **Nie kopiujemy** istniejących rzeźb wrocławskich krasnali.
**Syrenki (Warszawa):** własna figurka-maskotka 16×16 z tarczą i mieczem w formie zabawnej, nie kopia pomnika.

**Obwarzanki (Kraków).** Drewniana pamiątka 16×16 w kształcie plecionego pierścienia. Ciepły bursztynowy kolor, jasne okruszki i ciemny obrys odcinają ją od szarej kostki. Własny sprite w `src/render/CityCollectibles.ts`.

**Bursztyny (Gdańsk).** Pikselowa bryłka 16×16 ma nieregularny obrys, miodowo-pomarańczowe ścianki i jasny refleks. Ciemny kontur odcina ją od kostki Długiego Targu i jasnej nawierzchni nad wodą. Sprite powstaje w `src/render/CityCollectibles.ts`.

### Wieś i las

- **Gospodarstwo**: długa ceglana stodoła z wysokim, dwuspadowym dachem, niższy jasny dom i mały kamienny spichlerz.
- **Pole i las**: regularne rzędy sadzonek na pasach brązowej ziemi, nieregularne skupiska koron drzew na skraju drogi, droga gruntowa w ciepłych odcieniach.
- **Mostek**: krótka, wąska przeprawa nad strumieniem z brązowymi balustradami i widocznymi poprzeczkami.
- **Przystanek i ruch drogowy**: niska wiata z ławką i niebieski znak D-15. Autobus jest srebrnoszary. Zielony ciągnik ma krótki przód, oszkloną kabinę i duże tylne koła.
- **Tory**: na podsypce leży jedna para szyn. Z obu podejść widać A-10 i biało-czerwony krzyż św. Andrzeja.
- **Szkoła**. Niski piaskowy budynek z czerwonym dachem i wysuniętym gankiem. Od utwardzonego pobocza odchodzi jasny dziedziniec z drewnianą bramką, ławką i latarnią.
- **Szyszki**. Autorski sprite 16 × 16 ma zwężony czubek, brązowy obrys i jasne łuski ułożone na przemian. Powstaje w `src/render/CityCollectibles.ts`.
- **Scenka przy polu**. Rower leży przy skraju drogi gruntowej, a obok siedzi rowerzysta w niebieskim kasku. Generator mapy przypisuje scenkę do misji `WIE-A3-01`.

### Poznań

| Landmark | Sylwetka i paleta |
| --- | --- |
| Ratusz i koziołki | Jasna, trójkondygnacyjna optycznie fasada z ciemnymi arkadami, piętrząca się wieża z miedzianym hełmem, mały zegar i para jasnych koziołków na balkonie. Symetryczne pikselowe sylwetki trzykrotnie zbliżają głowy w południe czasu gry. |
| Domki budnicze | Wąskie podcienia pod szeregami spadzistych dachów, na przemian złocista, różowa, miętowa i niebieska elewacja. |
| Ostrów Tumski | Katedralna ceglana nawa z dwiema wieżami, miedziane dachy wież i czerwony most kratownicowy nad Wartą. |
| Dawny browar | Warzelnia, niższy magazyn i wysoki, wąski komin z ciemnoczerwonej cegły. Ściany bez napisów, reklam i oznaczeń handlowych. |
| Bulwar Warty | Jasne nabrzeże ze schodkami, ławkami, drzewami i odcinkiem czerwonej drogi dla rowerów na przeciwległym brzegu. |

**Drewniane rogale.** Autorski sprite 16 × 16 z łukiem o dwóch zwężonych końcach, pikselami w kolorze drewna i ciemnym obrysem. Powstaje w `src/render/CityCollectibles.ts`.

**Pomoc za mostem.** Nieruchomy rower leży obok siedzącego Turbo. Scenkę przy dojściu do katedry rysuje renderer dekoracji na podstawie obiektu z generatora mapy.

### Łódź

| Landmark | Sylwetka i paleta |
| --- | --- |
| Piotrkowska | Szereg wąskich kamienic z jasnymi gzymsami, wysoką kamienicą z miedzianym dachem pośrodku i ogródkami pod pikselowymi parasolami. |
| Fabryka | Długa hala z rytmem łukowych okien, przysadzista kotłownia i wysoki, ciemnoczerwony komin. Ceglane bryły otaczają prześwit bramy. |
| Podwórka | Na ścianach oficyn są dwa autorskie murale. Turkusowe fale i fioletowe romby układają się na granatowym tle z ochrowym akcentem. |
| Tramwaj, riksza i cargo | Tramwaj ma szarą karoserię ze stalowym pasem. Rikszę rozpoznaje się po dwóch tylnych kołach i zielonej ławce, a cargo po ochrowej skrzyni przed kierownicą. |

Bryły i rekwizyty rozmieszcza generator mapy. Murale powstają w rendererze ścian, a pojazdy w generatorze sprite’ów. Sylwetki są autorskie i pozbawione szyldów oraz logotypów. Tramwaj korzysta z neutralnej palety gry.

### Zakopane

| Landmark | Sylwetka i materiały |
| --- | --- |
| Krupówki | Brukowany deptak z małymi ogródkami, ławkami i latarniami. Przed wille prowadzi sąsiednia droga pieszo-rowerowa. |
| Drewniane wille | Ciemne gonty, wyraźna kalenica i trójkątne lukarny. Brązowe bale, jasne ramy okien i niski kamienny cokół. Bryły i proporcje są autorskie. |
| Giewont | Niebieskoszara grań z łagodnym grzbietem po lewej, stromym urwiskiem po prawej i małym krzyżem na szczycie. Bliżej widać ciemne świerki. Sylwetka przesuwa się w poziomie wolniej od kamery i stanowi tło północnego skraju Krupówek. |
| Mostki i droga | Drewniane pomosty z bocznymi belkami, niebieski potok i szary mur oporowy przy zjeździe. |
| Drewniane świerki | Autorskie płaskie figurki z trzema poziomami gałązek, ciemną obwódką i jasnym rysunkiem słojów. Sprite 16 × 16 pikseli generuje renderer znajdziek. |

## 7. Kafelki (tileset minimum)
Asfalt (zwykły, łatany, mokry), linie (ciągła, przerywana, P-10 zebra, P-11 przejazd rowerowy — czerwony/kratka, P-12, P-13 trójkąty, P-23 symbol roweru, strzałki), chodnik (płyty), kostka, kocie łby, krawężniki (z przejściami obniżonymi), DDR (czerwona nawierzchnia), trawa, żwir, pobocze, tory tramwajowe (w jezdni i na zieleni), tory kolejowe, zapory (animowane), woda (animowana 4 klatki), nabrzeże, schodki, piasek plaży miejskiej, liście jesienią, śnieg (wariant zimowy).

### Stan oprawy terenu i zabudowy

Miasteczko, Warszawa i Wrocław korzystają z własnego atlasu terenu. Generator map dobiera
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

Studzienki i liście pojawiają się przy sąsiednich typach nawierzchni zgodnie
z deterministycznym ziarnem mapy. Przy śniegu renderer podmienia trawę i płyty
chodnika podczas tworzenia tekstury fragmentu. Oznakowanie i czerwone drogi
rowerowe pozostają czytelne. Kałuże i oświetlenie są osobnymi warstwami.
Stojaki z rowerami, ogródki i kioski bez marek uzupełniają rekwizyty uliczne.
[Aktualny audyt oraz ujęcia przed i po](AUDYT_GRAFIKI.md).

Wzory oznakowania pochodzą z [załącznika nr 2 do rozporządzenia o szczegółowych warunkach technicznych dla znaków i sygnałów drogowych](https://eli.gov.pl/eli/DU/2019/2311/ogl).

## 8. Znaki drogowe
Sprite'y znaków 16×16 (na mapie) i 64×64 (Album, quiz, stop-klatka). Rysowane **wg wzorów z rozporządzenia** (kształt, kolor, piktogram) w pixel-arcie — muszą być jednoznacznie rozpoznawalne. Lista w `content/znaki.yaml`. W stop-klatce znak, którego dotyczy błąd, pulsuje.

## 9. UI i font
- **Press Start 2P** w logo, tytułach, nagłówkach paneli, krótkich etykietach przycisków, wartościach HUD-u, licznikach sygnalizacji i napisie „OBLAŁEŚ!”. Rozmiary są wielokrotnościami 8 px. Tekst nakładki DOM ma rozmiar niezależny od skali płótna gry.
- **VT323** w dialogach i dymkach Sierżant Oli, odpowiedziach quizu, opisach misji, Albumie, Strefie Rodzica, notach licencyjnych i treści certyfikatu. Tekst UI ma domyślnie 20 lub 24 px, a wyróżnienia 32 px. Etykiety na planszy używają rozmiarów dopasowanych do znaków i rekwizytów.
- Oba fonty mają polskie glify i licencję SIL OFL 1.1. Skład paczki PWA obejmuje lokalne subsety WOFF2 latin i latin-ext. Build sprawdza znaki z `i18n/pl.json` i `content/` w źródłowych plikach TTF.
- W lewym górnym rogu są punkty i mnożnik Serii Bezpieczeństwa, w prawym Uwaga Drogówki (trzy gwizdki i odczyt liczbowy) oraz zegar misji. Strzałka przy krawędzi pokazuje kierunek i odległość do celu. Ikony pauzy i SzprychaApp są przy dolnej krawędzi. Minimapa pozostaje opcjonalna.
- Kolory UI: granat `#1a1c2c` tło paneli, żółć `#ffcd75` akcent, biel tekst. Kontrast min. 4.5:1.
- Ikony jazdy korzystają z masek 12×12 generowanych przez `tools/ui-art.ts`.
  Kolor wskazuje stan wyposażenia, a kształt rozróżnia warunki pogodowe.

## 10. Efekty
Deszcz (ukośne piksele, kałuże odbijające światła), śnieg, mgła (gradient widoczności), noc (patrz §3), konfetti przy sukcesie, „UPS!” w komiksowej chmurce przy błędzie, świecący ślad przy combo ×3+, dym z kominów, gołębie podrywające się do lotu.


### Światło i efekty w grze

- Noc ma granatową warstwę multiply (`#29366f`). Atlas efektów ma stopniowane aureole latarni, stożek lampki roweru, podwójny reflektor pojazdu, neon, desenie opadów i gradient mgły. Światła są dodawane po przyciemnieniu sceny. Okna naświetlają osobne maski na tych samych rzutowanych fasadach. Pozycje neonów Pragi pochodzą z dekoracji mapy.
- Tylny odblask wzmacnia się, gdy rower znajdzie się tyłem w reflektorach, i krótko utrzymuje jasność, żeby uniknąć migotania na brzegu wiązki. Render świateł i powtórki bazuje na próbce symulacji.
- Misje wyznaczają opady i mgłę, a podgląd deszczu w pauzie pozwala zobaczyć refleksy w kałużach. Dym ma źródło w kominach, a gołębie startują, kiedy rowerzysta podjeżdża blisko. Konfetti pojawia się przy ukończeniu misji, a ślad świetlny podczas jazdy z serią ×3 lub wyższą.
- Ustawienie „Mniej efektów” i ograniczenie ruchu w systemie zatrzymują animację opadów, neonu i dymu, pozostawia gołębie na ziemi, pokazuje statyczne konfetti oraz zastępuje ruchomy ślad poświatą pod rowerem. Tryb uproszczony stosuje te same warianty, ogranicza liczbę detali i pomija emisję fasad. Latarnie, neony i reflektory nadal oświetlają scenę.
- Podgląd nocy w F3 służy do sprawdzania grafiki. Widoczność, pora symulacji i stan lampek używany przez detektory pochodzą z dotychczasowych danych symulacji.

Praga w dzień, w nocy i podczas deszczu, przed zmianą po lewej i po zmianie po prawej. [Zrzuty porównawcze](graphics-32-before-after.webp)


## Portrety zleceniodawców (#103)

Renderer portretów z #101 składa klatkę 64×64 z kształtu twarzy, fryzury, opcjonalnych okularów i nakrycia głowy oraz ubrania. Osobne palety skóry, włosów i ubioru zachowują wielotonowy światłocień. Neutralność, radość, zaskoczenie, zmartwienie i duma zmieniają mimikę. Postać stojąca przy POI ma sprite 24×24 w tych samych kolorach.

Galeria pokazuje 24 postacie z pięcioma wyrazami twarzy w kolejności używanej przez grę. Można ją odtworzyć poleceniem `npx tsx tools/client-gallery.ts`. [Galeria](screenshots/103-galeria.png)
