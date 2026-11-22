# SZPRYCHA: Miejscy Kurierzy — paczka startowa dla Codexa

Edukacyjna gra akcji w stylu GTA2 (widok z góry, pixel-art) przygotowująca dzieci do egzaminu na kartę rowerową. Warszawa i Wrocław w skali mikro, misje kurierskie, rywal, tajemnica do rozwiązania — a przepisy uczą się przy okazji.

## Jak użyć z Codexem
1. Utwórz puste repozytorium i wrzuć do niego całą zawartość tej paczki (`AGENTS.md` musi być w katalogu głównym — Codex czyta go automatycznie).
2. Pierwsze polecenie dla Codexa:
   > Przeczytaj AGENTS.md i całą dokumentację w podanej tam kolejności. Następnie zrealizuj kamień milowy M0. Po zakończeniu zaktualizuj PROGRESS.md i NOTES_FOR_HUMAN.md.
3. Kolejne polecenia: „Zrealizuj M1”, „Zrealizuj M2”… — po każdym kamieniu przejrzyj PR, zagraj w build i odpowiedz na pytania w `NOTES_FOR_HUMAN.md`.
4. Merytorykę (`dydaktyka/`, `content/przepisy.yaml`, `content/pytania.json`) daj do recenzji konsultantowi równolegle z M0–M3 — pozycje `weryfikacja: true` są do sprawdzenia w pierwszej kolejności.

## Zawartość
| Ścieżka | Co to |
|---|---|
| `AGENTS.md` | Master prompt: zasady, stos, architektura, kamienie milowe z kryteriami ukończenia |
| `docs/01_wizja_i_zakres.md` | Wizja, filary, tryby gry, zakres MVP |
| `docs/02_fabula.md` | Świat, postacie, łuki fabularne Warszawy („Zakłócacz”) i Wrocławia („Zaginione Krasnale”), finał |
| `docs/03_misje.md` | Archetypy misji, schemat danych, 40 misji fabularnych + 16 pobocznych |
| `docs/04_punktacja_rankingi.md` | Punkty, combo, Uwaga Drogówki, gwiazdki, rangi, mastery, Licencja, rankingi, osiągnięcia |
| `docs/05_mapy.md` | Mapy miast (5 dzielnic każde), warstwy Tiled, tabela pokrycia przepisów |
| `docs/06_art_direction.md` | Pixel-art, paleta, efekt 2.5D bloków GTA2, specyfikacja landmarków (też jako prompty dla grafika) |
| `docs/07_silnik_zasad.md` | Architektura wykrywania przepisów, algorytmy, testy scenariuszowe |
| `docs/08_ux_sterowanie_audio.md` | Sterowanie, HUD, dialogi, radio, dostępność |
| `docs/09_prywatnosc_sklepy.md` | RODO dzieci, Google Play Families, Apple Kids |
| `docs/zrodla_i_stan_prawny.md` | Źródła, stan prawny, śledzone zmiany |
| `dydaktyka/M01–M08` | Materiały dydaktyczne — moduł po module |
| `content/przepisy.yaml` | 68 przepisów z ID, tekstami dla dziecka i feedbackiem |
| `content/znaki.yaml` | 53 znaki do Albumu |
| `content/pytania.json` | 54 pytania z wyjaśnieniami |
| `content/balans.yaml` | Wszystkie liczby balansu i parametry prawne |
| `content/osiagniecia.yaml` | 20 osiągnięć |

Stan prawny: 21.11.2026. Zastrzeżenie: Licencja Szprychy w grze to trening — kartę rowerową wydaje szkoła po egzaminie.

### Konfiguracja Strefy Rodzica

Zmienne Vite ustawia się przed budowaniem gry. Pusta wartość ukrywa odpowiedni element.

- `VITE_RANKING_URL` — adres usługi rankingów (HTTPS lub HTTP na localhost do testów). W M10a przełącznik zapisuje wybór lokalnie.
- `VITE_PRIVACY_POLICY_URL` — adres opublikowanej polityki prywatności (HTTPS).
- `VITE_PROJECT_URL` — adres strony projektu (HTTPS).

Szablony do przygotowania wydania są w [legal/](legal/).
