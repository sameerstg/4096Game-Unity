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
committed, so regenerate it before building. In PowerShell:

```powershell
npx expo prebuild --platform android --no-clean
cd android
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
adb install -r app\build\outputs\apk\release\app-release.apk
```

Use `--no-clean`: a plain `prebuild` deletes `android/` and with it every
compiled native library, turning a one-minute build into a ten-minute one.

Drop `-PreactNativeArchitectures` to build for every CPU type. A release APK
is signed with the debug key unless the upload key is configured (below), which
is fine for installing on your own devices.

The package is `com.Sameerstg.numberPuzzleGame`, the same as the Unity game's
Play listing, so this build replaces it there. A phone that already has the
Play version installed won't accept a locally signed APK over it, because the
signatures differ; uninstall that version first, or test through a Play testing
track instead.

## Building an app bundle for Google Play

Play only accepts an app bundle (`.aab`) signed with the listing's upload key:
`F:/2048 user.keystore`, alias `2048`, the same key the Unity build used. Keep
an offline backup of that file. Losing it means asking Google to reset the
upload key, and it must never go in this repository, which is public.

`plugins/withReleaseSigning.js` wires the key into the generated
`android/app/build.gradle` from four Gradle properties. They live in
`~/.gradle/gradle.properties`, outside the repository, so the passwords are
never committed:

```properties
GAME4096_UPLOAD_STORE_FILE=F:/2048 user.keystore
GAME4096_UPLOAD_KEY_ALIAS=2048
GAME4096_UPLOAD_STORE_PASSWORD=...
GAME4096_UPLOAD_KEY_PASSWORD=...
```

Use forward slashes. Java reads these files with backslash as an escape
character, so `F:\2048 user.keystore` would arrive as `F:2048 user.keystore`.

With all four set, this signs the bundle without asking anything:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-aab.ps1
```

If the two passwords are absent it asks once and passes them to that build
alone, never writing them to disk. Either way it refuses to report success
unless the finished bundle really carries a non-debug signature, and it prints
the certificate's SHA-1 to compare against the Play Console's App integrity
page. The bundle lands in
`android/app/build/outputs/bundle/release/app-release.aab`.

`scripts/build-aab.sh` is the same thing for a real bash shell. Note that on
this machine `bash` resolves to a WSL stub with no distribution installed, so
the PowerShell version is the one to use.

The scripts build all four architectures: 32- and 64-bit ARM for phones, plus
x86 and x86_64 for Chromebooks and emulators. In a bundle the extra ones cost
users nothing, because Play sends each device only the code it needs — about
11.8 MB either way — they only make the uploaded file bigger. They do double
the native compile, which can exhaust a 16 GB machine, so the scripts cap how
many build tasks run at once. To build for one architecture while developing,
pass `-PreactNativeArchitectures=arm64-v8a`.

Building a bundle with any of the four properties missing fails immediately
rather than falling back to the debug key, which Play would reject. To build
one deliberately unsigned and sign it separately, pass
`-PGAME4096_UNSIGNED_BUNDLE` (`=false` turns it back off), then:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\sign-aab.ps1
```

That runs `jarsigner`, which asks for the password itself, writes
`app-release-signed.aab`, and prints its SHA-1.

To release a new version, raise `version` and `android.versionCode` in
`app.json`. The version code must be higher than any build ever uploaded to
Play, including rejected ones.

Upload `android/app/build/outputs/mapping/release/mapping.txt` alongside a
release, or Play's crash reports will show obfuscated names. App bundles carry
it automatically, under `BUNDLE-METADATA`.

## Permissions and size

The release build requests exactly one permission, `MODIFY_AUDIO_SETTINGS`,
which comes with the audio library.

`android.blockedPermissions` in `app.json` strips everything else the Expo
template and its libraries pull in, including `INTERNET`,
`ACCESS_NETWORK_STATE` and `WAKE_LOCK`. The game is entirely offline, and its
listing was removed under the Device and Network Abuse policy, so it should not
ask for network access at all. Development builds still need `INTERNET` to
reach Metro, so `plugins/withDebugInternet.js` puts it back in the debug
manifest only; a build type's manifest outranks the main one's removal, which
is how the template already handles `SYSTEM_ALERT_WINDOW`.

`expo-build-properties` turns on R8 and resource shrinking for release builds.
That took the compiled code from 25.8 MB to 9.0 MB, and a phone's download from
about 17.8 MB to 11.8 MB. Minification can break React Native through
reflection, so after changing it, test a release build on a device rather than
trusting the build to succeed: launch it, play a few moves, then force-stop and
reopen it to check the saved board still loads.

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
