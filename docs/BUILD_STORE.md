# Przygotowanie wydania sklepowego

Ta instrukcja dotyczy wersji offline bez rankingów i klas. Produkcyjna paczka mobilna korzysta z Capacitor. Na urządzeniach sprawdź ją zgodnie z [instrukcją buildów mobilnych](BUILD_MOBILE.md).

## Materiały sklepowe

Zainstaluj Node w wersji z `.nvmrc`, zależności projektu i Chromium dla Playwright.

```sh
npm ci
npx playwright install chromium
npm run store:assets
```

Przygotowanie zależności i Chromium może wymagać sieci. Sam generator buduje lokalnie wariant `mobile` w katalogu tymczasowym. Wyłącza konfigurację rankingów i linków zewnętrznych, a Playwright dopuszcza tylko połączenia z lokalnym serwerem na `127.0.0.1`. Każde urządzenie ma osobną, świeżą sesję. W CI workflow **Web quality** udostępnia pełny zestaw jako artefakt **store-assets**. Katalog `store/` jest ignorowany przez Git.

W każdym katalogu urządzenia powstaje pięć poziomych zrzutów PNG. Kolejność w sklepie odpowiada kolejności nazw plików.

| Sklep i format | Katalog w `store/` | Wymiary | Liczba |
| --- | --- | ---: | ---: |
| Google Play, telefon | `google-play/telefon/` | 1920 × 1080 | 5 |
| Google Play, tablet 7″ | `google-play/tablet-7/` | 1920 × 1080 | 5 |
| Google Play, tablet 10″ | `google-play/tablet-10/` | 2560 × 1440 | 5 |
| App Store, iPhone 6,9″ | `app-store/iphone-6-9/` | 2868 × 1320 | 5 |
| App Store, iPad 13″ | `app-store/ipad-13/` | 2752 × 2064 | 5 |
| Google Play, grafika promocyjna | `google-play/grafika-promocyjna.png` | 1024 × 500 | 1 |
| Google Play, ikona | `google-play/ikona.png` | 512 × 512 | 1 |

- `01-kask-i-swiatla.png` pokazuje rowerzystę w zapiętym kasku z włączonymi lampkami na drodze dla rowerów. Ujęcie korzysta z podglądu nocy.
- `02-prowadzenie-na-przejsciu.png` pokazuje prowadzenie roweru po zebrze po zejściu z roweru przed wejściem.
- `03-plac-manewrowy.png` pokazuje ćwiczenie ósemki.
- `04-album-znakow.png` pokazuje znak sfotografowany po zejściu z roweru i zatrzymaniu się poza jezdnią.
- `05-mapa-umiejetnosci.png` pokazuje moduły w świeżej sesji z pominięciem danych profilu, rangi, punktów, wyników i rekordu.

Zrzuty i grafika promocyjna są zapisywane jako PNG RGB. Ikona PNG RGBA korzysta z generatora ikon M9. Ikona App Store pochodzi z zestawu ikon projektu iOS tworzonego przez `npm run assets:mobile`. [Wymagania grafik Google Play](https://support.google.com/googleplay/android-developer/answer/9866151) · [Wymiary zrzutów App Store](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/)

Przepisz nazwę, opis i kategorię z [`content/sklep.yaml`](../content/sklep.yaml). Pole `krotki_opis` jest krótkim opisem Google Play, a `slowa_kluczowe` służą do pola Keywords w App Store Connect. Pełny opis zawiera informacje o działaniu offline, reklamach i zakupach. Build odrzuca wartości przekraczające limity lub zawierające zakazane nazwy.

## Checklista wydania

- [ ] Wydawca potwierdza dane kont Google Play Console i Apple Developer / App Store Connect, identyfikatory paczek i dostęp do podpisywania.
- [ ] Ustal wersję gry w `package.json` i odpowiednim wpisie `package-lock.json`. Ustaw tę samą wersję jako Android `versionName` w `android/app/build.gradle` i iOS `MARKETING_VERSION` w ustawieniach Xcode (`CFBundleShortVersionString`). Zwiększ Android `versionCode` oraz iOS `CURRENT_PROJECT_VERSION` (`CFBundleVersion`) względem ostatnio wgranego buildu.
- [ ] Konsultant potwierdza stan prawny w `content/przepisy.yaml` i `content/pytania.json`. Po recenzji i zgodzie na publikację wpisz jej autora oraz zakres w `content/o-grze.yaml`.
- [ ] Uzupełnij i zatwierdź politykę prywatności oraz dane wydawcy z `legal/`. Dodaj adres polityki w obu sklepach. Jeśli adres jest widoczny w grze, sprawdź dostęp przez bramkę w Strefie Rodzica.
- [ ] Uruchom `npm run licenses:check`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:e2e` i `npm run store:assets`. Zweryfikuj noty licencyjne w paczce oraz kadry w artefakcie CI.
- [ ] Zbuduj paczkę poleceniem `VITE_RANKING_URL='' npm run build -- --mode mobile`. Wykonaj `npx cap sync` dla docelowych platform. Sprawdź na fizycznym telefonie i tablecie start w trybie samolotowym, ekran „O grze” oraz brak funkcji rankingów i klas w Strefie Rodzica.
- [ ] **Android, krok wydawcy.** Skonfiguruj Play App Signing oraz klucz przesyłania. Zbuduj i podpisz AAB z konfiguracją release w Gradle lub Android Studio. Prześlij do testów zamkniętych. Klucz i hasła przechowuj poza repozytorium.
- [ ] **iOS, krok wydawcy.** Skonfiguruj Team, certyfikaty i profile w Xcode na macOS. Utwórz podpisane archiwum Release dla urządzenia i prześlij je do App Store Connect. Sprawdź paczkę przez TestFlight.
- [ ] **Google Play Families.** Zadeklaruj rzeczywistą grupę docelową dzieci w ustawieniach odbiorców. Uzupełnij IARC zgodnie z zawartością gry, zadeklaruj brak reklam i zakupów oraz wypełnij Data safety. Dla zweryfikowanego wariantu offline bez rankingów i klas zadeklaruj brak zbierania i udostępniania danych.
- [ ] **Apple Kids Category.** Potwierdź grupę wiekową 9–11, bramkę przed linkami wychodzącymi oraz brak reklam, zakupów i zewnętrznej analityki. Uzupełnij klasyfikację wiekową i App Privacy jako „Data Not Collected” dla zweryfikowanego wariantu offline bez rankingów i klas.
- [ ] Wgraj zrzuty do odpowiednich grup urządzeń oraz grafikę promocyjną i ikonę do Google Play. Obejrzyj podgląd kart obu sklepów.

Jeśli konfiguracja wydania zmieni sposób użycia danych, dostosuj politykę prywatności i formularze do rzeczywistego działania paczki. [Założenia prywatności i klasyfikacji](09_prywatnosc_sklepy.md) · [Polityka licencji](LICENCJE.md)
