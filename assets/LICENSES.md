# Licencje assetów

- `fonts/PixelifySans.ttf`: Pixelify Sans, SIL Open Font License 1.1.
  Autorzy i pełne warunki w `fonts/OFL.txt`.
  Źródło: https://github.com/google/fonts/tree/main/ofl/pixelifysans (pobrano 2026-11-21).
  Font jest lokalny, bez zapytań do Google Fonts podczas gry.
- Rower i oprawa menu: własne kształty proceduralne w `src/scenes/MainMenu.ts`.

M1: `generated/tiles.png` i `generated/rider.png` są własnymi placeholderami generowanymi przez `tools/gen-placeholders.ts`; bez zewnętrznych grafik. Rozmiary i opisy są w `assets/manifest.json`. Nie są docelową oprawą artystyczną.

M4b: the original dialogue portrait sheets in `generated/portraits/` are drawn by
`tools/gen-placeholders.ts` using the project's palette.

Grafika terenu, dachów, fasad i elementów ulicy w `generated/` jest rysowana
przez `tools/gen-placeholders.ts` z użyciem własnych wzorów pikselowych i kolorów
z `assets/palette.hex`.
