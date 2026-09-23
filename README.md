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

Drop `-PreactNativeArchitectures` to build for every CPU type. A release APK
is signed with the debug key unless the upload key is configured (below), which
is fine for installing on your own devices.

The package is `com.Sameerstg.numberPuzzleGame`, the same as the Unity game's
Play listing, so this build replaces it there. A phone that already has the
Play version installed won't accept a locally signed APK over it, because the
signatures differ; uninstall that version first, or test through a Play testing
track instead.

## Building an app bundle for Google Play

Play only accepts an app bundle (`.aab`) signed with the listing's upload key.
The Unity project signed with `C:/Users/stg/Downloads/user (1).keystore`
(alias `2048`); keep a backup of that file, because losing it means asking
Google to reset the upload key.

`plugins/withReleaseSigning.js` wires the key into the generated
`android/app/build.gradle` from four Gradle properties. The keystore path and
alias live in `~/.gradle/gradle.properties`, outside the repository:

```properties
GAME4096_UPLOAD_STORE_FILE=C:/Users/stg/Downloads/user (1).keystore
GAME4096_UPLOAD_KEY_ALIAS=2048
```

Then run:

```bash
bash scripts/build-aab.sh
```

It asks for the keystore password, so the password is never written to disk,
builds the bundle, and prints the signing certificate's SHA-1. Compare that
with the upload key certificate on the Play Console's App integrity page before
uploading. The bundle is written to
`android/app/build/outputs/bundle/release/app-release.aab`.

The script builds for 32- and 64-bit ARM, which covers every Android phone.
x86 only matters for emulators and a few Chromebooks (the Unity build shipped
64-bit ARM alone), and leaving it out halves the native compile, which can
otherwise run a 16 GB machine out of memory.

To build without the prompt, add `GAME4096_UPLOAD_STORE_PASSWORD` and
`GAME4096_UPLOAD_KEY_PASSWORD` to `~/.gradle/gradle.properties` as well. Either
way, building a bundle without all four properties fails straight away rather
than falling back to the debug key, which Play would reject.

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
| Win-target dropdown (2048 / 4096 / 8192 / 16384) | Goal picker, same four targets |
| Grid size per target (4×4, 5×5, 5×5, 6×6) | `MODES` in `src/game/config.ts` |
| `GridGenerator` tile colour list | Replaced by a new palette (see below) |
| Score + per-mode high score in `PlayerPrefs` | Per-mode keys in AsyncStorage |
| Board auto-save / restore per target | `serialize` / `deserialize` + AsyncStorage |
| Swipe and arrow-key input | `PanResponder`, plus arrow/WASD keys on web |
| Match / move / win / lose sounds, music toggle | `expo-audio`, same clips as AAC |
| iTween tile slide | `Animated` slide, pop-in and merge bounce |
| Result banner, 2s pause, auto new game | A dialog that waits for the player (see below) |

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
- When the board leaves spare room, the header and controls slide toward it
  so they stay together as one group instead of floating apart.

## Look and feel

A bright hyper-casual style: a sky-to-lilac gradient, white cards, the rounded
Fredoka font, and chunky candy tiles that sit on a darker lip of their own
colour. Everything visual lives in `src/game/config.ts`.

- **Tile colours** travel round the wheel from teal (2) to gold (2048), so
  bigger tiles read as warmer. The goal tiles past 2048 are glowing "jewels"
  that break the pattern on purpose. The 2 and 4 tiles, compared most often,
  are in different colour families.
- **Numbers** are white until 128 and dark from 256, switching once, wherever
  white still meets the 3:1 large-text contrast bar.
- **The goal picker** fills the chosen goal with that goal tile's own colour,
  so you can see which tile you're chasing.

`npm run test:logic` guards these: neighbouring tiles must be at least 15 ΔE
apart, every number must reach 3:1 contrast, and the text colour must switch
exactly once.

The app icons come from the same colours and font. `node scripts/make-icons.js`
renders them with headless Chrome: the gold 2048 goal tile, alone so its number
still reads at launcher size. It writes `assets/icon.png`, the three Android
adaptive layers, `favicon.png`, and `store-icon.png`, the 512×512 image to
upload in Play Console. The Android layers are scaled to stay inside the circle
launchers may crop to, and the themed-icon layer knocks the number out of a
solid tile, since the system floods that layer with one colour.

## Game flow

- Each merge shows a floating `+N` on the score.
- Reaching the goal opens a dialog over the finished board: **Keep going**
  carries on past the goal (and won't ask again), **New game** starts over.
- Running out of moves shows the score, the best score and your highest tile,
  and waits for **Try again**.
- The new-game button asks first if there's a scored game in progress. Swipes
  are ignored while any dialog is open.

## Notes

- `app.json` sets `orientation: "default"`; the layout handles rotation live.
- Scores saved by the Unity version aren't carried over: it stored them in
  Unity's `PlayerPrefs`, which this app can't read.
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
