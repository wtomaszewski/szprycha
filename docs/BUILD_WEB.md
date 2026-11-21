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
