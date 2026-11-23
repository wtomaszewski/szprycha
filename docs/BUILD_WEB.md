# Build web i podglądy Cloudflare Pages

## Build lokalny

Użyj Node.js 24 zgodnie z `.nvmrc`. Vite zapisuje build w katalogu `dist/`.

```sh
npm ci
npm run build
npm run preview
```

`npm test` uruchamia test, który sam buduje wersję web w tymczasowym katalogu i sprawdza dyrektywę `noindex` w wygenerowanym pliku `_headers`.

## Konfiguracja Cloudflare Pages

Projekt `szprycha` korzysta z integracji Git przez aplikację GitHub **Cloudflare Workers and Pages** podłączoną do repozytorium `wtomaszewski/szprycha`.

| Ustawienie | Wartość |
| --- | --- |
| Gałąź produkcyjna | `main` |
| Katalog główny | Katalog główny repozytorium |
| Polecenie budowania | `npm run build` |
| Katalog wyjściowy | `dist` |
| Zmienna środowiskowa | `NODE_VERSION=24` w produkcji i podglądach |

Wdrożenia z `main` są dostępne pod adresem <https://szprycha.pages.dev>.
Adres podglądu `https://<hash>.szprycha.pages.dev` pojawia się po buildzie w komentarzu bota Cloudflare w PR. Link można też znaleźć w Cloudflare w **Workers & Pages → szprycha → Deployments**.

Aby zmienić konfigurację, otwórz **Workers & Pages → szprycha → Settings → Builds & deployments**. W sekcji **Branch control** wybierz, które gałęzie mają tworzyć podglądy, albo ustaw **None**, aby je wyłączyć. W tej samej sekcji można zmienić gałąź produkcyjną i wyłączyć jej automatyczne wdrożenia.

Vite kopiuje `public/_headers` do `dist/_headers`. Cloudflare Pages stosuje `X-Robots-Tag: noindex` na wszystkich ścieżkach w podglądach i w produkcji. Dokument HTML zawiera także metatag `robots` z wartością `noindex`. Na stronie podglądu można sprawdzić nagłówek poleceniem `curl -I <adres-podglądu>`.

## Instalacja i próba offline

1. Uruchom powyższą wersję produkcyjną przez `npm run preview` i otwórz adres wypisany przez Vite (zwykle `http://127.0.0.1:4173`). Poza adresem lokalnym service worker wymaga HTTPS. Poczekaj na menu i status aktywnego workera w **DevTools → Application → Service Workers**.
2. W Chrome lub Edge wybierz instalację z paska adresu albo menu przeglądarki. Na iPhonie lub iPadzie otwórz Safari i wybierz **Udostępnij → Do ekranu początkowego**. Uruchom grę z ikony i sprawdź tryb samodzielnego okna w orientacji poziomej. Na urządzeniach Apple z dopasowanymi wymiarami i DPR system wybiera wygenerowany obraz startowy. Gra wyświetla własny ekran startowy również w innych rozmiarach.
3. Wyłącz sieć, otwórz ponownie grę i wejdź do Miasteczka. Aby przetestować miasto i radio offline, najpierw włącz sieć, wybierz miasto i pozwól wybranej playliście się pobrać. Następnie odłącz sieć, uruchom grę ponownie i odwiedź to samo miasto. Profil jest zapisany w IndexedDB.
4. Aby sprawdzić aktualizację, pozostaw grę otwartą na tym samym adresie, opublikuj zmieniony build i wróć do okna gry lub użyj **Update** przy rejestracji workera w DevTools. Komunikat „Dostępna nowa wersja – uruchom ponownie” pozwala dokończyć misję. Zamknij wszystkie karty i okna gry, po czym otwórz ją ponownie. Nowa wersja uruchomi się z dotychczasowym profilem.

`npm run test:e2e -- tests/e2e/pwa.spec.ts` sprawdza manifest i warunki instalacji zgłaszane przez Chromium, start i jazdę w Miasteczku bez sieci, wcześniejsze pobranie mapy Warszawy i playlisty oraz instalację kolejnego workera podczas misji. Test aktualizacji otwiera nowy build offline i porównuje profil z zapisem sprzed ponownego uruchomienia. Ten sam zestaw uruchamia CI.
