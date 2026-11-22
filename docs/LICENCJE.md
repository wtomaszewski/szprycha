# Licencje przy wydaniu komercyjnym

SZPRYCHA jest oprogramowaniem własnościowym. Prawa do projektu są zastrzeżone w [LICENSE](../LICENSE), a pakiet ma oznaczenie `UNLICENSED`. Komponenty zewnętrzne zachowują własne licencje.

## Kod i zależności

- Do gry dystrybuowanej przez web, App Store lub Google Play można dołączać kod zewnętrzny na licencjach `MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `Apache-2.0`, `0BSD`, `Zlib`, `BlueOak-1.0.0`, `CC0-1.0` i `Unlicense`.
- W paczce gry zabronione są GPL, LGPL, AGPL, MPL, EPL, CC-BY-SA, SSPL, wszystkie warianty NC i ND oraz licencje nieznane lub własne bez przeglądu. MPL-2.0 jest dopuszczalne w narzędziach używanych wyłącznie do budowania, np. w Lightning CSS.
- Każdy PR dodający lub aktualizujący zależność sprawdza także zależności przechodnie, kod już osadzony w paczce i obowiązki dotyczące not. Klasyfikacja jako `devDependency` jest właściwa dla narzędzi używanych tylko w środowisku deweloperskim. Bibliotekę importowaną przez grę deklarujemy w `dependencies`.
- `npm run licenses:check` sprawdza metadane zainstalowanych pakietów osiągalnych z `dependencies`, w tym zainstalowane zależności opcjonalne i peer. Odrzuca brak licencji lub identyfikator spoza listy. Złożone wyrażenia SPDX i wpisy odsyłające do innego pliku wymagają indywidualnego przeglądu. Raport dla zależności wyłącznie deweloperskich pokazuje odstępstwa jako ostrzeżenia.
- Build tworzy `dist/THIRD_PARTY_NOTICES` z tekstami licencji, informacjami o prawach autorskich, plikami `NOTICE` i licencją fontu. Pełny tekst Apache 2.0 jest dołączany do not, również gdy paczka zawiera skróconą notę. Gracz znajdzie te same informacje w **O grze → Licencje komponentów zewnętrznych**. Build korzysta z dystrybucji Arcade Physics Phasera, która pomija Matter.js i jego pomocniczy kod na niestandardowej licencji. Przy aktualizacji Phasera przejrzyj osadzone komponenty tej dystrybucji i zaktualizuj plik `assets/licenses/phaser-<wersja>.txt`.

Ekran rankingów M10c używa istniejącego arkusza rowerzysty i fontu. [Pochodzenie zasobów](../assets/LICENSES.md)

## Serwer rankingów

`npm run licenses:check` obejmuje także zależności wykonawcze workspace `server/`. Serwer korzysta z Zod (MIT) oraz wbudowanych modułów Node.js (licencja MIT projektu Node.js, SQLite jest w domenie publicznej). Zod zachowuje swój plik licencji w kontenerze. Narzędzia budujące korzystają z istniejących zależności repozytorium. [Zod](https://github.com/colinhacks/zod/blob/main/LICENSE) · [Node.js](https://github.com/nodejs/node/blob/main/LICENSE) · [SQLite](https://www.sqlite.org/copyright.html)

Dockerfile używa etapu budowania z Docker Official Image Node (repozytorium na MIT) oraz obrazu wykonawczego Distroless Node.js 24 (repozytorium na Apache-2.0). Składniki systemowe i biblioteki w obrazach zachowują własne licencje i noty dystrybucji. [Docker Official Image Node](https://github.com/nodejs/docker-node/blob/main/LICENSE) · [Distroless](https://github.com/GoogleContainerTools/distroless/blob/main/LICENSE)

M10d korzysta z wbudowanego `node:crypto` do haszowania haseł i generowania kodów klas oraz z istniejących zależności. Panel web używa systemowego fontu i autorskiego CSS. [Pochodzenie zasobów](../assets/LICENSES.md)

## Grafika, audio, fonty i teksty

- Grafikę, efekty, muzykę i inne zasoby tworzymy sami. Domyślnym źródłem zasobów jest generator w repozytorium. Wyjątki to fonty na SIL Open Font License 1.1 i materiały CC0 z udokumentowanym źródłem. Materiał CC-BY wymaga wpisu do [#7](https://github.com/wtomaszewski/szprycha/issues/7) i uprzedniej zgody Wojtka.
- Każdy zasób pobrany z zewnątrz wymaga przed użyciem wpisu do [assets/LICENSES.md](../assets/LICENSES.md) z nazwą źródła, autorem, licencją, datą pozyskania i URL. Zachowujemy wymagane noty i treści licencji.
- W M8 muzykę, dżingle i efekty dźwiękowe syntetyzujemy własnym kodem, używając Web Audio albo generatora w `tools/`, który tworzy pliki OGG podczas budowania. Lektor używa wyłącznie głosów systemowych urządzenia przez Web Speech lub natywne TTS. Do paczki nie dołączamy nagrań lektora ani sampli z zewnętrznych bibliotek.
- Wykluczamy logotypy i charakterystyczne oznaczenia firm oraz instytucji, w tym Rockstar/GTA, Metro Warszawskiego, MZA, Tramwajów Warszawskich, MPK Wrocław, PKP, Policji, PSP i Pogotowia, klubów sportowych oraz marek samochodów. Pojazdy uprzywilejowane wyróżniamy kolorami i sygnałami.
- Używamy nazw miejsc jako nazw geograficznych, np. PKiN, Stadion Narodowy i Hala Stulecia. Charakterystyczne budynki przedstawiamy we własnej interpretacji graficznej, bez kopiowania zdjęć i ilustracji.
- Akty prawne nie podlegają ochronie prawnoautorskiej. Zasady opisujemy własnymi słowami i tworzymy własne pytania oraz ilustracje. Cudze podręczniki, testy na kartę rowerową i grafiki WORD-u lub Policji mogą podlegać ochronie.

W M10a listy słów do generatora nicków i szablony w `legal/` są treściami własnymi. Zrzuty Strefy Rodzica pochodzą z testów Playwright. [Pochodzenie zasobów](../assets/LICENSES.md)

Generator materiałów do sklepów korzysta z istniejących narzędzi deweloperskich i zasobów lokalnego buildu. Grafika promocyjna i ikona są pochodnymi własnych zasobów gry oraz fontu na OFL 1.1. [Pochodzenie zasobów](../assets/LICENSES.md)

Kwestie do rozstrzygnięcia przed wydaniem są w [NOTES_FOR_HUMAN.md](../NOTES_FOR_HUMAN.md).
