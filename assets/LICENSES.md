# Pochodzenie i licencje zasobów

## Zasoby zewnętrzne

| Plik                                            | Źródło                                                | Autor                                                | Licencja                                                  | Data pozyskania | URL                                                                |
| ----------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------- | --------------- | ------------------------------------------------------------------ |
| `fonts/press-start-2p/PressStart2P-Regular.ttf` | Google Fonts                                          | The Press Start 2P Project Authors (cody@zone38.net) | SIL Open Font License 1.1, `fonts/press-start-2p/OFL.txt` | 2026-11-23      | <https://github.com/google/fonts/tree/main/ofl/pressstart2p>       |
| `fonts/press-start-2p/*.woff2`                  | `@fontsource/press-start-2p@5.2.7`, latin i latin-ext | The Press Start 2P Project Authors                   | SIL Open Font License 1.1, `fonts/press-start-2p/OFL.txt` | 2026-11-23      | <https://www.npmjs.com/package/@fontsource/press-start-2p/v/5.2.7> |
| `fonts/vt323/VT323-Regular.ttf`                 | Google Fonts                                          | The VT323 Project Authors (peter.hull@oikoi.com)     | SIL Open Font License 1.1, `fonts/vt323/OFL.txt`          | 2026-11-23      | <https://github.com/google/fonts/tree/main/ofl/vt323>              |
| `fonts/vt323/*.woff2`                           | `@fontsource/vt323@5.2.7`, latin i latin-ext          | The VT323 Project Authors                            | SIL Open Font License 1.1, `fonts/vt323/OFL.txt`          | 2026-11-23      | <https://www.npmjs.com/package/@fontsource/vt323/v/5.2.7>          |

Gra używa lokalnych kopii fontów WOFF2, dołączonych do pamięci podręcznej PWA. Pliki TTF służą do walidacji glifów oraz generowania grafiki sklepowej. W `licenses/` są teksty dołączane do not o kodzie zewnętrznym. Plik `Apache-2.0.txt` pochodzi z Apache Software Foundation, a `phaser-3.90.0.txt` zawiera noty komponentów osadzonych w Phaserze i odnośniki do pochodzenia wymagającego weryfikacji. [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)

### Nagrania lektora (`voice/pl/`)

Wpis do uzupełnienia po wyborze głosu i pierwszym renderowaniu. Dostawca, plan z licencją komercyjną, nazwa i identyfikator głosu z biblioteki, data pozyskania oraz wersja i adres zaakceptowanego regulaminu oczekują na decyzję Wojtka. Publikacja obejmuje wyłącznie głos biblioteczny z potwierdzonymi prawami, bez klonowania głosu realnej osoby. Źródła warunków dla obsługiwanych usług [ElevenLabs](https://elevenlabs.io/terms-of-use) i [Azure Speech](https://www.microsoft.com/licensing/terms/productoffering/MicrosoftAzure/all).

## Zasoby własne projektu

| Pliki i elementy                                                                        | Kod źródłowy                                                                                                                                                                             |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paleta i manifest, kafelki, dachy, ściany, detale dachów i rekwizyty w `generated/`     | `palette.hex`, `manifest.json`, `tools/gen-placeholders.ts`, `tools/city-art.ts`                                                                                                         |
| Portrety w `generated/portraits/`                                                       | `src/render/portraitArt.ts`, `tools/portrait-art.ts`, `tools/gen-placeholders.ts`                                                                                                        |
| Rower, oświetlenie roweru, piesi i pojazdy w `generated/`                               | `tools/sprite-art.ts`, `tools/gen-placeholders.ts`                                                                                                                                       |
| Stożki świateł, poświaty, deszcz, śnieg i gradient mgły w `generated/city-effects.png`  | `tools/effect-art.ts`, `tools/gen-placeholders.ts`                                                                                                                                       |
| Przyciemnienie mapy, kałuże, nakładka kamizelki i tylnego odblasku                      | `src/render/NightLighting.ts`, `src/render/CityAtmosphere.ts`, `tools/sprite-art.ts`. Autorskie efekty proceduralne.                                                                     |
| Ilustracje Albumu i quizu w `generated/signs/`                                          | `tools/sign-art.ts`. Własne rysunki oparte na wzorach z załącznika nr 2 do rozporządzenia o szczegółowych warunkach technicznych dla znaków i sygnałów drogowych (Dz.U. 2019 poz. 2311). |
| Ikony PWA, ikona Apple i ekrany startowe w `dist/pwa/`                                  | `tools/app-icons.ts`. Autorska grafika koła i szprych w palecie projektu, generowana lokalnie podczas budowania.                                                                         |
| Ikony jazdy w `generated/ui-icons.png`                                                  | `tools/ui-art.ts`, `tools/gen-placeholders.ts`                                                                                                                                           |
| Oprawa menu i mapa wyboru miasta                                                        | `src/scenes/MainMenu.ts`, `src/scenes/CityPicker.ts`                                                                                                                                     |
| Sylwetki budynków, dekoracje, oznakowanie drogowe, figurki krasnali i wyposażenie placu | `src/render/`, generatory map w `tools/`                                                                                                                                                 |
| Reguły, pytania, dialogi i teksty interfejsu                                            | `content/`, `i18n/`. Przepisy opisane własnymi słowami. Źródła aktów prawnych w `docs/zrodla_i_stan_prawny.md`.                                                                          |
| Efekty dźwiękowe, także dzwonki i neutralna syrena                                      | `src/audio/effects.ts`. Własny generator przebiegów, obwiedni i szumu z ustalonym ziarnem. Próbki powstają w pamięci podczas gry.                                                        |
| Radio Szprycha FM 2.0 i próbki odsłuchowe                                               | `src/audio/radio/`, `tools/radio/` i `src/audio/Radio.ts`. Własna synteza muzyki i dżingli (`generated/radio/*.mp3`) oraz próbek OGG. Bez zewnętrznych sampli i plików MIDI.             |
| Teksty lektora i porady Dzwonek Talk                                                    | `voice/manifest.json`, `content/`, `i18n/pl.json`. Własne teksty gry.                                                                                                                    |

Sylwetka Giewontu w `generated/giewont.png` pochodzi z `tools/zakopane-art.ts` i `tools/gen-placeholders.ts`. Drewniane wille, mostki i mur oporowy Zakopanego generują `tools/gen-zakopane-map.ts`, `tools/zakopane-scenery.ts`, `src/render/BlockArt.ts` i `src/render/MapDecorations.ts`. Zrzuty `docs/screenshots/141-*` pochodzą z lokalnej gry uruchomionej przez Playwright. Wszystkie te elementy są zasobami własnymi na warunkach licencji projektu.

Krakowskie obwarzanki rysuje `src/render/CityCollectibles.ts`. Zrzuty kampanii z #106 pochodzą z lokalnej gry uruchomionej przez Playwright.

Listy w `content/zleceniodawcy.yaml` są autorskie. Gra komponuje portrety i sprite’y fikcyjnych klientów przy użyciu `src/render/portraitArt.ts` i `src/render/dailyClientArt.ts`. Galerię tworzy `tools/client-gallery.ts`. Pozostałe zrzuty `docs/screenshots/103-*` pochodzą z lokalnej gry.

Listy słów w `content/nicki.json` są autorskie. Strefa Rodzica korzysta z istniejących kolorów kasku i lokalnego fontu. Zrzuty `docs/screenshots/80-*.png` wygenerował Playwright z działającej gry.

Wytwory projektu podlegają [LICENSE](../LICENSE). W bieżącej wersji gra nie dystrybuuje nagrań, sampli ani muzyki z zewnętrznych bibliotek.

Serwer M10b korzysta z istniejących list nicków i identyfikatorów awatarów. Licencje kodu i środowiska serwera opisano w [docs/LICENCJE.md](../docs/LICENCJE.md#serwer-rankingów).

Ekran rankingów M10c używa klatek rowerzysty z istniejącego generatora i lokalnego fontu. Zrzuty `docs/screenshots/82-*.png` pochodzą z testu Playwright z lokalnym serwerem.

Panel nauczyciela M10d używa systemowego fontu przeglądarki. Zrzuty `docs/screenshots/83-*.png` wygenerował Playwright z lokalnym serwerem i danymi testowymi.

Zrzuty sklepowe w `store/` i podglądy `docs/screenshots/90-*` pochodzą z lokalnego buildu gry w Playwright. Grafika promocyjna korzysta ze zrzutu gry, ikony z `tools/app-icons.ts` oraz lokalnych fontów OFL 1.1. Istniejące grafiki sprzed #133 zachowują wygląd Pixelify Sans, a generator używa lokalnych Press Start 2P i VT323. Ikona sklepowa powstaje z tego samego generatora M9.

## Audyt oznaczeń w #63

Przejrzano arkusze PNG i font w `assets/`, procedury rysowania w `src/render/`, generatory i definicje scenerii w `tools/` oraz warstwę tekstową w `content/` i `i18n/`.

- Oznaczenie „M” przy Pałacu Kultury zastąpił piktogram schodów na turkusowej tablicy. Lokalne identyfikatory mapy opisują miejsce.
- Pojazdy służb rozróżniają sylwetki, kolory i belki świetlne. Tramwaje mają uproszczone malowania miejskie. Generatory nie rysują na tych pojazdach logotypów, herbów ani nazw przewoźników.
- Scenerie używają nazw miejsc i własnych brył budynków. Portrety oraz krasnale są fikcyjnymi projektami. W treści gry użyto nazw pospolitych takich jak „policjant” i opisów funkcji pojazdów. Odniesienia do stylistyki innych gier występują w dokumentacji roboczej.
- Do przeglądu przed wydaniem pozostały m.in. nazwy i wizerunki miejsc oraz podobieństwo malowań taboru. Lista jest w [NOTES_FOR_HUMAN.md](../NOTES_FOR_HUMAN.md).
