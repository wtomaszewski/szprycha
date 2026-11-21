# 09 — Prywatność dzieci, bezpieczeństwo i sklepy

## Zasady (privacy by design)
1. **Domyślnie zero danych osobowych.** Profil = nick z generatora + avatar + postęp, przechowywane lokalnie (IndexedDB / Capacitor Preferences).
2. **Wiek** pytamy tylko jako przedział („mam mniej niż 10 lat / 10–15 / 16+”) wyłącznie w celu dopasowania treści (np. KASK-01, jazda pod opieką) — przechowywany lokalnie.
3. **Brak zewnętrznej analityki, reklam, SDK społecznościowych, czatu, wolnego tekstu.** Jeżeli potrzebna telemetria błędów — własny, anonimowy endpoint, bez identyfikatorów urządzenia, wyłączalny, tylko po zgodzie rodzica.
4. **Rankingi online (M10)** — włączane przez rodzica w Strefie Rodzica. Na serwer trafia: losowy identyfikator profilu (UUID generowany lokalnie), nick z generatora, avatar id, wyniki. Brak e-maila, imienia, lokalizacji.
5. **Kody klas (M10):** nauczyciel tworzy klasę (konto nauczyciela z e-mailem — to dorosły), uczniowie dołączają kodem, widoczni pod nickiem. Nauczyciel może przypisać nickom etykiety tylko lokalnie w swojej przeglądarce (nie na serwerze).
6. **Linki zewnętrzne** (polityka prywatności, strona projektu) wyłącznie w Strefie Rodzica, za bramką.
7. **Dane na serwerze** w UE, możliwość usunięcia profilu z serwera jednym przyciskiem.

## Dokumenty do przygotowania (przez człowieka, Codex tworzy szablony w `legal/`)
- Polityka prywatności (wersja dla rodzica + wersja obrazkowa dla dziecka).
- Regulamin.
- Klauzula „materiał edukacyjny pomocniczy, stan prawny na dzień: …; Licencja Szprychy nie jest kartą rowerową”.
- Informacja o recenzji merytorycznej (kto zweryfikował treść).

## Google Play
- Program/wymogi **Families** (aplikacja skierowana do dzieci): deklaracja grupy docelowej, brak SDK niezgodnych z polityką rodzinną, brak reklam (w naszym przypadku), polityka prywatności.
- Formularz bezpieczeństwa danych (Data safety): „nie zbieramy danych” w wersji bez rankingów; aktualizacja przy M10.
- Klasyfikacja IARC (oczekiwane PEGI 3).
- Kategoria: Edukacja (lub Gry → Edukacyjne).

## Apple App Store
- **Kids Category** (przedział 9–11): brak reklam i zewnętrznej analityki, bramka rodzicielska przed linkami wychodzącymi i zakupami, polityka prywatności.
- App Privacy („Data Not Collected” bez rankingów).
- Build iOS wymaga macOS + Xcode (lub usługa CI z runnerem macOS); konto Apple Developer płatne rocznie.

## Bezpieczeństwo treści
- Brak przemocy, obrażeń, scen wypadków z poszkodowanymi widocznymi w drastyczny sposób. Upadek w scenach pierwszej pomocy: postać siedzi/leży, bez krwi.
- Postać policjantki przedstawiona pozytywnie; brak elementów zastraszania karami.
- Brak mechanik hazardowych (loot boxy, losowania za walutę).
