# Build mobilny

Capacitor 8 pakuje produkcyjny build Vite do aplikacji Android i iOS. Wersja mobilna uruchamia grę z plików w paczce, z ograniczeniem połączeń WebView do lokalnego źródła. Android przyznaje grze wyłącznie uprawnienie do wibracji. Aplikacja uruchamia się poziomo i chowa paski systemowe. W razie wymuszenia układu pionowego przez system gra pokazuje komunikat o obróceniu urządzenia.

## Zasoby wspólne

Wymagany jest Node w wersji z `.nvmrc`.

```sh
npm ci
npm run licenses:check
npm run build -- --mode mobile
```

Katalog `dist/` zawiera produkcyjne pliki gry oraz `THIRD_PARTY_NOTICES` z licencjami bibliotek natywnych, dostępnymi też w ustawieniach gry. Zmień grafikę w generatorze M9a i wykonaj `npm run assets:mobile`, aby odtworzyć wersje ikon i ekranu startowego używane przez oba projekty.

## Android

Zainstaluj JDK 21, Android SDK Platform 36 i Build Tools 36.0.0. Ustaw `ANDROID_HOME` na zainstalowane SDK.

```sh
npx cap sync android
(cd android && ./gradlew :app:assembleDebug)
python3 tools/check-mobile.py android android/app/build/outputs/apk/debug/app-debug-unsigned.apk
```

Workflow **Mobile quality** udostępnia ten sam plik jako artefakt **szprycha-debug-unsigned**. Do instalacji na emulatorze lub urządzeniu podpisz kopię APK lokalnym kluczem debug. Android Studio może utworzyć taki klucz w prywatnym katalogu użytkownika. Następnie użyj `apksigner sign --ks ~/.android/debug.keystore --ks-key-alias androiddebugkey --out szprycha-local-debug.apk android/app/build/outputs/apk/debug/app-debug-unsigned.apk` i `adb install szprycha-local-debug.apk`.

Identyfikator aplikacji jest w `capacitor.config.ts` i `android/app/build.gradle`. Po wyborze identyfikatora publikacji właściciel ustawi konfigurację podpisu release w procesie wydania. Klucze i hasła pozostają w magazynie poza repozytorium.

## iOS

CI na Linuksie wykonuje `npx cap sync ios` i sprawdza konfigurację, politykę prywatności oraz komplet plików gry. Budowanie i uruchomienie aplikacji wymaga macOS i Xcode 26 z obsługą Swift Package Manager.

```sh
npx cap sync ios
python3 tools/check-mobile.py ios
open ios/App/App.xcodeproj
```

W Xcode wybierz schemat **App** i symulator. Z wiersza poleceń można użyć `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`.

Identyfikator iOS jest ustawiony w **App → Signing & Capabilities → Bundle Identifier**. Konto, Team, certyfikaty i provisioning właściciel konfiguruje lokalnie przed buildem na urządzenie lub wydaniem. Manifest `PrivacyInfo.xcprivacy` deklaruje użycie UserDefaults do zapisu lokalnych preferencji.

## Sprawdzenie na urządzeniu

1. Otwórz grę w trybie samolotowym. Sprawdź ekran startowy, czytelność HUD-u przy wycięciu ekranu oraz przejazd.
2. Zdobądź żetony, zamknij aplikację i wróć do profilu. Przy aktualizacji z wersji zapisującej w IndexedDB w tej samej WebView gra odczytuje istniejący profil i kopiuje go do Preferences. Zapis w przeglądarce lub PWA należy do osobnego magazynu urządzenia.
3. Przećwicz dobry nawyk i popełnij błąd. W ustawieniach wyłącz wibracje i powtórz przejazd.
4. Włącz lektora. Z zainstalowanym polskim głosem systemowym narracja działa offline. W razie braku głosu lub błędu natywnego lektor korzysta z lokalnego polskiego głosu Web Speech, jeśli urządzenie go udostępnia. Tekst pozostaje widoczny także na urządzeniu bez głosu.
