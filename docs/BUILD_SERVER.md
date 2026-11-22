# Serwer rankingów M10b

## Lokalnie

Wymagany jest Node.js 24. Z katalogu repozytorium:

```sh
npm ci
npm run test:server
npm run build:server
RANKING_ORIGINS=http://127.0.0.1:5173 npm run start:server
curl http://127.0.0.1:8787/v1/health
```

Serwer korzysta z wbudowanych `node:http` i `node:sqlite`. Build zapisuje program i katalog reguł w `server/dist/`. Katalog jest wyliczany z wersjonowanych danych gry. Przy zmianie logiki fizyki, oceny lub naliczania XP należy zmienić odpowiedni klucz wersji w `server/src/buildRules.ts` lub w `placCourseKey`. Build serwera jest osobnym poleceniem i osobnym zadaniem CI. Klienta rankingów przewiduje M10c.

| Zmienna                       | Domyślnie              | Znaczenie                                                                                                                                                  |
| ----------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RANKING_HOST`                | `127.0.0.1`            | Adres nasłuchu. W kontenerze `0.0.0.0`.                                                                                                                    |
| `RANKING_PORT`                | `8787`                 | Port HTTP.                                                                                                                                                 |
| `RANKING_DB`                  | `data/rankings.sqlite` | Ścieżka względem katalogu `server/` przy uruchomieniu przez npm. `:memory:` pozwala testować lokalnie.                                                     |
| `RANKING_ORIGINS`             | pusta lista            | Dokładne adresy origin oddzielone przecinkami, np. `https://gra.example,capacitor://localhost`. Skonfiguruj rzeczywiste originy web i aplikacji mobilnych. |
| `RANKING_REQUESTS_PER_MINUTE` | `240`                  | Limit żądań aplikacji na adres połączenia w oknie 60 s.                                                                                                    |
| `RANKING_SEASON_START`        | `2026-01-05`           | Data odniesienia cyklu sezonów w formacie RRRR-MM-DD w Warszawie.                                                                                          |
| `RANKING_SEASON_WEEKS`        | `13`                   | Długość sezonu w tygodniach, od 1 do 52.                                                                                                                   |

## Kontrakt API

Żądania z tożsamością używają nagłówka `Authorization: Bearer <UUIDv4>`. Jest to losowy UUID profilu z M10a. Klient przechowuje go lokalnie i używa jako prywatnego klucza dostępu do profilu. Wysyła go przez HTTPS. Odpowiedzi i publiczne tabele pomijają UUID. Błędy API mają postać `{"error":"kod"}` i nie powtarzają treści żądania.

| Metoda i ścieżka           | Zachowanie                                                                                                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/health`           | Status procesu.                                                                                                                                                                                                                                                                                   |
| `GET /v1/rules`            | Katalog wersji, dostępnych misji i granic wiarygodności związanych z grą.                                                                                                                                                                                                                         |
| `POST /v1/scores`          | Przyjmuje JSON `{ nickname, avatarId, score }` z prawidłowym UUID w nagłówku. Zwraca `201` dla zapisanego wyniku, `200` z `accepted: false` dla ponowienia lub niższego tygodniowego XP, `400` dla błędnego schematu, `409` dla XP spoza bieżącego tygodnia i `422` dla wyniku niespójnego z grą. |
| `GET /v1/rankings?board=…` | Do 50 wpisów w `top` oraz pozycja profilu w `self` przy przekazaniu UUID.                                                                                                                                                                                                                         |
| `GET /v1/leagues`          | Dostępne ligi oraz liga profilu przy przekazaniu UUID.                                                                                                                                                                                                                                            |
| `DELETE /v1/profile`       | Jednym żądaniem usuwa profil, XP, wyniki, dowody ponowień, ligę i wkład w wyniki miast. Zawsze `204` dla poprawnego UUID, także po powtórzeniu. Klient usuwa oczekujące wysyłki profilu i po ponownej rejestracji używa nowego UUID.                                                              |

Formaty żądań są współdzielone z klientem przez `src/content/rankings.ts`. Każdy `score` podaje 32-bitowy `seed`, `version` odpowiadającą wersji gry i `inputHash` w postaci 64 małych cyfr szesnastkowych SHA-256. Skrót liczy klient z logu wejść. Sam log pozostaje lokalnie. Wersje misji, wolnej jazdy i XP należy powiązać z danymi używanymi przez dany build gry. Dla placu wersja to SHA-256 (UTF-8) istniejącego klucza `placCourseKey(plac, balans.plac)`. W v1 weryfikujemy format dowodu oraz granice fizyczne i punktowe. Odtworzenie przejazdu przewidziano na v2.

- `board=mission&city=warszawa&missionId=WAW-A1-01` pokazuje najlepsze punkty z ukończonej misji bez `major`. `mission` podaje czas w tickach, punkty, miasto i identyfikator misji oraz liczbę werdyktów, najdłuższą serię i czyste metry. Przejazdy przy normalnym tempie mają `speedPercent: 100`.
- `board=safety` pokazuje najdłuższy ciąg werdyktów `good` z jednej misji lub wolnego przejazdu. Wynik `ride` wolnej jazdy podaje te same dane jazdy co misja, poza punktami i identyfikatorem misji.
- `board=plac` pokazuje najlepszy czas całego czystego Arcade w tickach (60 ticków/s). Wynik `plac` podaje ticki, tempo oraz liczbę `minor` i `major`.
- `board=cities` sumuje czyste metry z misji i wolnej jazdy osobno dla Warszawy i Wrocławia w bieżącym tygodniu. `self` to lista miast, do których profil wniósł wkład, z metrami w `contributedMeters`. Dystans raportuje się w całych metrach jako część statystyk gry. Przejazd z błędem ma zero czystych metrów.
- `board=weekly-xp&league=bronze` pokazuje tygodniowe XP wybranej ligi (`bronze` Brąz, `silver` Srebro, `gold` Złoto). `weekly-xp` przesyła narastające XP zdobyte w danym tygodniu oraz jego poniedziałkową datę w `week`. Serwer zachowuje najwyższą wartość. XP podawaj z dokładnością do pół punktu jak w grze.

Rankingi misji, serii i placu resetują widok na początku sezonu. Przejazdy z kolejki trafiają do tygodnia i sezonu według czasu przyjęcia przez serwer. Ponowienie tej samej jazdy z tym samym ziarnem i skrótem jest neutralne także po resecie. Tygodniowe XP i rywalizacja miast resetują się w poniedziałek o północy w `Europe/Warsaw`. Przy pierwszym odczycie ligi lub zapisie po granicy tygodnia serwer awansuje górne 20% aktywnych graczy z każdej ligi (zaokrąglenie w górę). Gracz może awansować o jeden poziom w danym tygodniu. Liga pozostaje między sezonami. Remisy na tablicach rozstrzygane są deterministycznie, a przy XP kolejność jest taka sama jak przy awansie.

## Kontener i wymagania hostingu w UE

```sh
docker build -f server/Dockerfile -t szprycha-rankings .
docker volume create szprycha-rankings
docker run --rm -p 127.0.0.1:8787:8787 \
  -v szprycha-rankings:/data \
  -e RANKING_ORIGINS=http://127.0.0.1:5173 szprycha-rankings
```

Kontener działa jako użytkownik `65532:65532`. Przy montowaniu katalogu hosta nadaj temu użytkownikowi prawo zapisu. Host, wolumin i ewentualne kopie danych muszą pozostać w UE. Używaj jednej instancji z lokalnym trwałym woluminem SQLite. Terminu dostępności kopii oraz usunięć z nich trzeba dopilnować przy wyborze hostingu.

Ustaw HTTPS i wyłącz logowanie żądań, nagłówków (w tym `Authorization`) i adresów IP także w proxy, na platformie i w monitoringu. Serwer zapisuje tylko UUID, wygenerowany nick, identyfikator awatara i wyniki wraz z metadanymi tabel oraz skrótami do deduplikacji. Komunikaty diagnostyczne są stałe. Limit żądań używa niejawnego skrótu adresu połączenia w pamięci przez maksymalnie minutę. Za proxy wszystkie jego połączenia dzielą limit, więc skonfiguruj dodatkowy krótkotrwały limit na wejściu, z wyłączonym zapisem IP.

Usługa jest opcjonalna. Gra działa offline i korzysta z rankingów wyłącznie po skonfigurowaniu klienta oraz włączeniu funkcji przez rodzica.
