# Pochodzenie i licencje zasobów

## Zasoby zewnętrzne

| Plik                     | Źródło                              | Autor                             | Licencja                                                 | Data pozyskania | URL                                                          |
| ------------------------ | ----------------------------------- | --------------------------------- | -------------------------------------------------------- | --------------- | ------------------------------------------------------------ |
| `fonts/PixelifySans.ttf` | Google Fonts, katalog Pixelify Sans | The Pixelify Sans Project Authors | SIL Open Font License 1.1, pełny tekst w `fonts/OFL.txt` | 2026-11-21      | <https://github.com/google/fonts/tree/main/ofl/pixelifysans> |

Gra używa lokalnej kopii fontu. W `licenses/` są teksty dołączane do not o kodzie zewnętrznym. Plik `Apache-2.0.txt` pochodzi z Apache Software Foundation, a `phaser-3.90.0.txt` zawiera noty komponentów osadzonych w Phaserze i odnośniki do pochodzenia wymagającego weryfikacji. [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)

## Zasoby własne projektu

| Pliki i elementy                                                                        | Kod źródłowy                                                                                                                                                                             |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paleta i manifest, kafelki, dachy, ściany, detale dachów i rekwizyty w `generated/`     | `palette.hex`, `manifest.json`, `tools/gen-placeholders.ts`, `tools/city-art.ts`                                                                                                         |
| Portrety w `generated/portraits/`                                                       | `tools/gen-placeholders.ts`                                                                                                                                                              |
| Rower, oświetlenie roweru, piesi i pojazdy w `generated/`                               | `tools/sprite-art.ts`, `tools/gen-placeholders.ts`                                                                                                                                       |
| Stożki świateł, poświaty, deszcz, śnieg i gradient mgły w `generated/city-effects.png`  | `tools/effect-art.ts`, `tools/gen-placeholders.ts`                                                                                                                                       |
| Przyciemnienie mapy, kałuże, nakładka kamizelki i tylnego odblasku                      | `src/render/NightLighting.ts`, `src/render/CityAtmosphere.ts`, `tools/sprite-art.ts`. Autorskie efekty proceduralne.                                                                     |
| Ilustracje Albumu i quizu w `generated/signs/`                                          | `tools/sign-art.ts`. Własne rysunki oparte na wzorach z załącznika nr 2 do rozporządzenia o szczegółowych warunkach technicznych dla znaków i sygnałów drogowych (Dz.U. 2019 poz. 2311). |
| Ikony PWA, ikona Apple i ekrany startowe w `dist/pwa/`                                  | `tools/app-icons.ts`. Autorska grafika koła i szprych w palecie projektu, generowana lokalnie podczas budowania.                                                                         |
| Oprawa menu i mapa wyboru miasta                                                        | `src/scenes/MainMenu.ts`, `src/scenes/CityPicker.ts`                                                                                                                                     |
| Sylwetki budynków, dekoracje, oznakowanie drogowe, figurki krasnali i wyposażenie placu | `src/render/`, generatory map w `tools/`                                                                                                                                                 |
| Reguły, pytania, dialogi i teksty interfejsu                                            | `content/`, `i18n/`. Przepisy opisane własnymi słowami. Źródła aktów prawnych w `docs/zrodla_i_stan_prawny.md`.                                                                          |
| Efekty dźwiękowe, także dzwonki i neutralna syrena                                      | `src/audio/effects.ts`. Własny generator przebiegów, obwiedni i szumu z ustalonym ziarnem. Próbki powstają w pamięci podczas gry.                                                        |
| Radio Szprycha FM i podkład Dzwonek Talk                                                | `src/audio/score.ts`, `src/audio/Radio.ts`. Autorskie melodie i dżingle, odtwarzane przez sekwencer i oscylatory Web Audio API.                                                          |
| Lektor i porady Dzwonek Talk                                                            | `src/audio/Narrator.ts`, `i18n/pl.json`. Web Speech API korzysta wyłącznie z lokalnych polskich głosów systemowych. Głosy pozostają na urządzeniu i nie wchodzą w skład gry.             |

Listy słów w `content/nicki.json` są autorskie. Strefa Rodzica korzysta z istniejących kolorów kasku i lokalnego fontu. Zrzuty `docs/screenshots/80-*.png` wygenerował Playwright z działającej gry.

Wytwory projektu podlegają [LICENSE](../LICENSE). W bieżącej wersji gra nie dystrybuuje nagrań, sampli ani muzyki z zewnętrznych bibliotek.

Serwer M10b korzysta z istniejących list nicków i identyfikatorów awatarów. Licencje kodu i środowiska serwera opisano w [docs/LICENCJE.md](../docs/LICENCJE.md#serwer-rankingów).

## Audyt oznaczeń w #63

Przejrzano arkusze PNG i font w `assets/`, procedury rysowania w `src/render/`, generatory i definicje scenerii w `tools/` oraz warstwę tekstową w `content/` i `i18n/`.

- Oznaczenie „M” przy Pałacu Kultury zastąpił piktogram schodów na turkusowej tablicy. Lokalne identyfikatory mapy opisują miejsce.
- Pojazdy służb rozróżniają sylwetki, kolory i belki świetlne. Tramwaje mają uproszczone malowania miejskie. Generatory nie rysują na tych pojazdach logotypów, herbów ani nazw przewoźników.
- Scenerie używają nazw miejsc i własnych brył budynków. Portrety oraz krasnale są fikcyjnymi projektami. W treści gry użyto nazw pospolitych takich jak „policjant” i opisów funkcji pojazdów. Odniesienia do stylistyki innych gier występują w dokumentacji roboczej.
- Do przeglądu przed wydaniem pozostały m.in. nazwy i wizerunki miejsc oraz podobieństwo malowań taboru. Lista jest w [NOTES_FOR_HUMAN.md](../NOTES_FOR_HUMAN.md).
