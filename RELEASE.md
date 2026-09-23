# Release notes

## 0.4 (version code 4)

The first release built on Expo and React Native. It replaces the Unity game
that was live as 0.2 (version code 2) on the same listing,
`com.Sameerstg.numberPuzzleGame`.

### What's new (Play Console, ≤500 characters)

```
A complete rebuild of the game.

• Fresh look: bright, chunky tiles on a cleaner board
• Four goals — 2048, 4096, 8192 and 16384 — each with its own board size
• Keep going past your goal instead of starting over
• Your board and best score are saved separately for every goal
• Swipe anywhere on the screen; quick swipes no longer get missed
• Fits any screen, portrait or landscape
• Smaller download, and no internet permission — the game is fully offline
```

Shorter alternative, 233 characters:

```
Completely rebuilt, with a fresh look.

• Four goals: 2048, 4096, 8192 and 16384
• Keep playing after you reach your goal
• Board and best score saved for each goal
• Smoother swipes, fits any screen
• Smaller download, fully offline
```

### For players

- Rebuilt from scratch. The rules are the same: slide tiles, merge matching
  numbers, reach the goal.
- Four goals to choose from, on a 4×4, 5×5 or 6×6 board.
- Reaching the goal no longer wipes the board after two seconds. The game waits
  and offers **Keep going**, so a won board can be played on.
- Running out of moves shows the final score, your best, and your highest tile.
- The new-game button asks first if a scored game is in progress.
- Each merge shows the points it earned.
- Tile colours run from teal through gold as numbers grow, so the board is
  readable at a glance, and every number meets a contrast bar for legibility.

### For the record

- Expo SDK 57, React Native 0.86.3. Game logic is pure TypeScript covered by 50
  tests (`npm run test:logic`).
- Target SDK 36, minimum SDK 24, `armeabi-v7a` and `arm64-v8a`.
- All native libraries are 16 KB page-size aligned, as Play now requires.
- One permission: `MODIFY_AUDIO_SETTINGS`, which the audio library brings in.
- R8 and resource shrinking are on: compiled code 9.0 MB (was 25.8 MB), and a
  phone downloads about 11.8 MB (was about 17.8 MB).
- The release was tested on-device before shipping: it launches, plays, keeps
  its sounds and icons through resource shrinking, and restores a saved board
  after being force-stopped.

### If the removal is appealed

The listing was removed under the Device and Network Abuse policy while it was
the Unity build. Facts that can be stated about this version, each verifiable
from the uploaded artifact:

- The app is rebuilt from scratch on Expo / React Native. No Unity runtime, and
  no ad, analytics or attribution SDK is present.
- It requests no network permission at all. `INTERNET` is blocked in the
  release manifest, so the app cannot open a network connection.
- There is no networking code in the source, and nothing is downloaded or
  executed at runtime; the JavaScript is compiled into the binary at build time.
- It requests no dangerous permissions: no microphone, no storage, no location,
  and no "display over other apps".
