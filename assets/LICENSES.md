# Licencje assetów

- `fonts/PixelifySans.ttf`: Pixelify Sans, SIL Open Font License 1.1.
  Autorzy i pełne warunki w `fonts/OFL.txt`.
  Źródło: https://github.com/google/fonts/tree/main/ofl/pixelifysans (pobrano 2026-11-21).
  Font jest lokalny, bez zapytań do Google Fonts podczas gry.
- Rower i oprawa menu: własne kształty proceduralne w `src/scenes/MainMenu.ts`.

M4b: the original dialogue portrait sheets in `generated/portraits/` are drawn by
`tools/gen-placeholders.ts` using the project's palette.

Grafika terenu, dachów, fasad i elementów ulicy w `generated/` jest rysowana
przez `tools/gen-placeholders.ts` z użyciem własnych wzorów pikselowych i kolorów
z `assets/palette.hex`.

Sprite’y uczestników ruchu (`generated/rider*.png` i `generated/traffic-*.png`)
powstają w `tools/sprite-art.ts` z własnych wzorów i palety projektu.
Układ klatek i wymiary są zapisane w `assets/manifest.json`.

Atlas efektów (`generated/city-effects.png`) powstaje w `tools/effect-art.ts`
z własnych wzorów i kolorów palety projektu.

Bryły, dekoracje i figurki krasnali z mapy Wrocławia to własna grafika
proceduralna projektu. Powstaje z danych `tools/wroclaw-scenery.ts` oraz kodu
`BlockArt.ts`, `MapDecorations.ts` i `Gnomes.ts` w `src/render/`.
