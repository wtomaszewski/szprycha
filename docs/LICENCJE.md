# Licencje przy wydaniu komercyjnym

SZPRYCHA jest oprogramowaniem własnościowym. Prawa do projektu są zastrzeżone w [LICENSE](../LICENSE), a pakiet ma oznaczenie `UNLICENSED`. Komponenty zewnętrzne zachowują własne licencje.

## Kod i zależności

- Do gry dystrybuowanej przez web, App Store lub Google Play można dołączać kod zewnętrzny na licencjach `MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `Apache-2.0`, `0BSD`, `Zlib`, `BlueOak-1.0.0`, `CC0-1.0` i `Unlicense`.
- W paczce gry zabronione są GPL, LGPL, AGPL, MPL, EPL, CC-BY-SA, SSPL, wszystkie warianty NC i ND oraz licencje nieznane lub własne bez przeglądu. MPL-2.0 jest dopuszczalne w narzędziach używanych wyłącznie do budowania lub testowania, np. w Lightning CSS.
- Każdy PR dodający lub aktualizujący zależność sprawdza także zależności przechodnie, kod już osadzony w paczce i obowiązki dotyczące not. Klasyfikacja jako `devDependency` jest właściwa dla narzędzi używanych tylko w środowisku deweloperskim. Bibliotekę importowaną przez grę deklarujemy w `dependencies`.
- `npm run licenses:check` sprawdza metadane zainstalowanych pakietów osiągalnych z `dependencies`, w tym zainstalowane zależności opcjonalne i peer. Odrzuca brak licencji lub identyfikator spoza listy. Złożone wyrażenia SPDX i wpisy odsyłające do innego pliku wymagają indywidualnego przeglądu. Raport dla zależności wyłącznie deweloperskich pokazuje odstępstwa jako ostrzeżenia.
- `@axe-core/playwright` i jego zależność `axe-core` są na licencji MPL-2.0. Audyt Playwright importuje je wyłącznie w testach e2e. Nie trafiają do paczki gry ani do pliku not licencyjnych.
- Build tworzy `dist/THIRD_PARTY_NOTICES` z tekstami licencji, informacjami o prawach autorskich, plikami `NOTICE` i pełnymi licencjami fontów. Pełny tekst Apache 2.0 jest dołączany do not, również gdy paczka zawiera skróconą notę. Gracz znajdzie te same informacje w **O grze → Licencje komponentów zewnętrznych**. Build korzysta z dystrybucji Arcade Physics Phasera, która pomija Matter.js i jego pomocniczy kod na niestandardowej licencji. Przy aktualizacji Phasera przejrzyj osadzone komponenty tej dystrybucji i zaktualizuj plik `assets/licenses/phaser-<wersja>.txt`.

Ekran rankingów M10c używa istniejącego arkusza rowerzysty i fontu. [Pochodzenie zasobów](../assets/LICENSES.md)

## Warstwa natywna Android/iOS

- `npm run licenses:check` porównuje deklaracje Gradle, wersje z `android/variables.gradle` i `package-lock.json` oraz pakiety z `ios/App/CapApp-SPM/Package.swift` z [manifestem natywnym](../licenses/native-deps.json). Kontrola w CI działa po instalacji npm i czyta lokalne pliki.
- Manifest obejmuje zależności bezpośrednie oraz rozstrzygnięte wersje Maven z Androidowego `releaseRuntimeClasspath`. Podstawą licencji Maven są opublikowane pliki POM. Wersja modułu `:capacitor-cordova-android-plugins` odpowiada wersji CLI, które generuje ten moduł. Pakiet Swift dystrybuuje framework Capacitora na MIT oraz warstwę zgodności Cordova z kodem na Apache-2.0.
- Po zmianie zależności wykonaj `npx --no-install cap sync android`, następnie `(cd android && ./gradlew :app:dependencies --configuration releaseRuntimeClasspath) > gradle-release.txt`. Porównaj raport z manifestem poleceniem `npm run licenses:check -- --strict --gradle-report gradle-release.txt`. Zaktualizuj wersje, źródła, licencje i noty zgodnie z rzeczywistą zawartością paczki. Przy zmianie Swift Package Manager sprawdź też pakiety rozwiązane w Xcode. Niewyjaśniony wpis ma `licenses: null` lub pole `review`, a tryb `--strict` zgłasza go jako błąd.
- Build z `--mode mobile` dołącza wersje i źródła bibliotek natywnych, ich noty z [assets/licenses/mobile.txt](../assets/licenses/mobile.txt) oraz pełne teksty MIT i Apache-2.0 do `dist/THIRD_PARTY_NOTICES`. Ten sam tekst jest dostępny offline w **O grze → Licencje komponentów zewnętrznych**. Wtyczka Gradle do budowania Androida jest sprawdzana jako narzędzie, a noty wydania obejmują biblioteki wykonawcze.

## Serwer rankingów

`npm run licenses:check` obejmuje także zależności wykonawcze workspace `server/`. Serwer korzysta z Zod (MIT) oraz wbudowanych modułów Node.js (licencja MIT projektu Node.js, SQLite jest w domenie publicznej). Zod zachowuje swój plik licencji w kontenerze. Narzędzia budujące korzystają z istniejących zależności repozytorium. [Zod](https://github.com/colinhacks/zod/blob/main/LICENSE) · [Node.js](https://github.com/nodejs/node/blob/main/LICENSE) · [SQLite](https://www.sqlite.org/copyright.html)

Dockerfile używa etapu budowania z Docker Official Image Node (repozytorium na MIT) oraz obrazu wykonawczego Distroless Node.js 24 (repozytorium na Apache-2.0). Składniki systemowe i biblioteki w obrazach zachowują własne licencje i noty dystrybucji. [Docker Official Image Node](https://github.com/nodejs/docker-node/blob/main/LICENSE) · [Distroless](https://github.com/GoogleContainerTools/distroless/blob/main/LICENSE)

M10d korzysta z wbudowanego `node:crypto` do haszowania haseł i generowania kodów klas oraz z istniejących zależności. Panel web używa systemowego fontu i autorskiego CSS. [Pochodzenie zasobów](../assets/LICENSES.md)

## Grafika, audio, fonty i teksty

- Grafikę, efekty, muzykę i inne zasoby tworzymy sami. Domyślnym źródłem zasobów jest generator w repozytorium. Wyjątki to fonty na SIL Open Font License 1.1 i materiały CC0 z udokumentowanym źródłem. Materiał CC-BY wymaga wpisu do [#7](https://github.com/wtomaszewski/szprycha/issues/7) i uprzedniej zgody Wojtka.
- Press Start 2P i VT323 są na licencji SIL OFL 1.1. Oryginalne pliki `OFL.txt` z prawami autorskimi znajdują się w katalogach `assets/fonts/press-start-2p/` i `assets/fonts/vt323/`. Press Start 2P ma zastrzeżoną nazwę fontu. Gra i PWA dystrybuują lokalne pliki WOFF2 z pakietów Fontsource. Oryginalne TTF pochodzą z repozytorium Google Fonts i służą do walidacji oraz generowania materiałów sklepowych. [Pochodzenie zasobów](../assets/LICENSES.md)
- Każdy zasób pobrany z zewnątrz wymaga przed użyciem wpisu do [assets/LICENSES.md](../assets/LICENSES.md) z nazwą źródła, autorem, licencją, datą pozyskania i URL. Zachowujemy wymagane noty i treści licencji.
- W M8 muzykę, dżingle i efekty dźwiękowe syntetyzujemy własnym kodem, używając Web Audio albo generatora w `tools/`. FFmpeg służy do przygotowania plików MP3 radia i próbek OGG. Build gry pakuje gotowe nagrania z repozytorium. Do paczki nie dołączamy sampli ani nagrań z zewnętrznych bibliotek dźwięków. Jedynym wyjątkiem są nagrania lektora opisane w sekcji [Nagrania lektora](#nagrania-lektora).
- Wykluczamy logotypy i charakterystyczne oznaczenia firm oraz instytucji, w tym Rockstar/GTA, Metro Warszawskiego, MZA, Tramwajów Warszawskich, MPK Wrocław, PKP, Policji, PSP i Pogotowia, klubów sportowych oraz marek samochodów. Pojazdy uprzywilejowane wyróżniamy kolorami i sygnałami.
- Test Vitest skanuje teksty gry, tłumaczenia, manifest lektora, pliki tekstowe materiałów sklepowych i literały w generatorach map. Lista oznaczeń jest wspólna z walidacją tekstów sklepowych. [Lista oznaczeń](../tools/brand-denylist.ts) · [Test i uzasadnione wyjątki](../tests/tools/brand-scan.test.ts)
- Używamy nazw miejsc jako nazw geograficznych, np. PKiN, Stadion Narodowy i Hala Stulecia. Charakterystyczne budynki przedstawiamy we własnej interpretacji graficznej, bez kopiowania zdjęć i ilustracji.
- Akty prawne nie podlegają ochronie prawnoautorskiej. Zasady opisujemy własnymi słowami i tworzymy własne pytania oraz ilustracje. Cudze podręczniki, testy na kartę rowerową i grafiki WORD-u lub Policji mogą podlegać ochronie.

W M10a listy słów do generatora nicków i szablony w `legal/` są treściami własnymi. Zrzuty Strefy Rodzica pochodzą z testów Playwright. [Pochodzenie zasobów](../assets/LICENSES.md)

Generator materiałów do sklepów korzysta z istniejących narzędzi deweloperskich i zasobów lokalnego buildu. Grafika promocyjna i ikona są pochodnymi własnych zasobów gry oraz fontu na OFL 1.1. [Pochodzenie zasobów](../assets/LICENSES.md)

Kwestie do rozstrzygnięcia przed wydaniem są w [NOTES_FOR_HUMAN.md](../NOTES_FOR_HUMAN.md).

## Nagrania lektora

Nagrania lektora pochodzą z Microsoft Azure AI Speech (plan S0, konto wydawcy). Głos to `pl-PL-ZofiaNeural`, standardowy głos neuronowy z biblioteki Azure, bez klonowania głosu realnej osoby. Nagrania wyrenderowano 2026-11-24 według [Microsoft Product Terms dla Azure](https://www.microsoft.com/licensing/terms/productoffering/MicrosoftAzure/all) w brzmieniu z tego dnia. Budżet obu formatów łącznie to 40 MiB i pilnuje go `npm run voice:check`. [Rejestr zasobów](../assets/LICENSES.md#nagrania-lektora-voicepl)

Przed zatwierdzeniem trzeba sprawdzić prawo do używania nagrań po zakończeniu subskrypcji, dystrybucję w PWA i sklepach mobilnych, warunki dla treści kierowanych do dzieci oraz ewentualne oznaczenia. FFmpeg z enkoderami libopus i AAC jest narzędziem do lokalnego przygotowania plików. Gra odtwarza zapisane pliki przez Web Audio. [Instrukcja dla Wojtka](../NOTES_FOR_HUMAN.md#93--nagrania-lektora-wojtek).
