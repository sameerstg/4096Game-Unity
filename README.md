# 4096 — Expo / React Native

The 4096 game on Expo (SDK 57, React Native 0.86).

This started as a port of the original Unity game. The Unity project is no
longer on `main`; it lives on the `unity` branch, together with the history of
this port.

## Running it

```bash
npm install
npm start          # dev server, then press a / i / w for Android / iOS / web
```

Individual targets:

```bash
npm run android    # native build, installed on a connected device
npm run ios
npm run web
```

## Building an APK for a phone

The native `android/` project is generated from `app.json` and is not
committed, so regenerate it before building:

```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
adb install -r app/build/outputs/apk/release/app-release.apk
```

Drop `-PreactNativeArchitectures` to build for every CPU type. The release APK
is signed with the debug key, which is fine for installing on your own devices
but not for Google Play: the store needs an app bundle (`./gradlew
bundleRelease`) signed with your upload key.

To release a new version, raise `version` and `android.versionCode` in
`app.json`. The version code must be higher than any build ever uploaded to
Play, including rejected ones.

`app.json` configures `expo-audio` without microphone access or background
playback. The game only plays sound in the foreground, and leaving the plugin
defaults on would add `RECORD_AUDIO` and a foreground-service permission that
Play asks you to justify.

## What came over from the Unity build

| Unity | Here |
| --- | --- |
| Win-target dropdown (2048 / 4096 / 8192 / 16384) | Mode chips, same four targets |
| Grid size per target (4×4, 5×5, 5×5, 6×6) | `MODES` in `src/game/config.ts` |
| `GridGenerator` tile colour list | `TILE_COLORS`, same 14 values |
| Score + per-mode high score in `PlayerPrefs` | Per-mode keys in AsyncStorage |
| Board auto-save / restore per target | `serialize` / `deserialize` + AsyncStorage |
| Swipe and arrow-key input | `PanResponder`, plus arrow/WASD keys on web |
| Match / move / win / lose sounds, music toggle | `expo-audio`, same clips as AAC |
| iTween tile slide and win banner scale-up | `Animated` slide, pop-in, merge bounce, banner |
| Result banner, 2s pause, auto new game | `RESULT_PAUSE` in `App.tsx` |

Sounds were transcoded from the Unity `Assets/Sounds` WAVs (on the `unity`
branch) to AAC, taking the
audio payload from 8.9 MB to about 420 KB.

## Layout

The board is sized from the measured play area rather than a fixed design
resolution, so it fits any screen:

- Portrait stacks score, controls and board; landscape moves the HUD into a
  sidebar so the board can use the full height.
- The board is always square at `min(areaWidth, areaHeight)`, and is absolutely
  positioned so its size can never feed back into the measurement.
- Type and control sizes scale from the shorter screen edge, clamped so they
  stay legible on small phones and don't balloon on tablets.
- Safe-area insets are applied on all four edges.
- Tile label colour is chosen per tile from its background luminance, so the
  bright cyan and yellow tiles stay readable.

## Notes

- `app.json` sets `orientation: "default"`; the layout handles rotation live.
- `android.package` / `ios.bundleIdentifier` are `com.sameerstg.game4096`.
  Change these before shipping if the app should replace the existing Unity
  listing (`com.Sameerstg.numberPuzzleGame`) rather than sit beside it.
- New tiles are always `2`, as in the Unity original. A new game deals two
  tiles rather than one.

## Checks

`src/game/logic.ts` is pure — no React or React Native imports — so it runs
under plain Node with no test framework:

```bash
npm run test:logic
```

That covers merge ordering (no triple merges, no double-merging a tile in one
turn), all four directions, blocked moves, win detection, absorbed-tile
bookkeeping, game-over detection at the board edges, spawning into the last free
cell, save/restore round trips, rejection of corrupt saved data, and a 60-turn
run asserting tile ids stay unique and no two tiles share a cell.

```bash
npm run typecheck
```
