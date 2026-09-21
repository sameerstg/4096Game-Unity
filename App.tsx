import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  useFonts,
} from '@expo-google-fonts/fredoka';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Board } from './src/components/Board';
import { Dialog } from './src/components/Dialog';
import { GoalPicker } from './src/components/GoalPicker';
import { Header } from './src/components/Header';
import { Gain, ScoreBar } from './src/components/ScoreBar';
import { TileFace } from './src/components/TileFace';
import { MOVE_DURATION } from './src/components/TileView';
import { MODES, THEME } from './src/game/config';
import {
  createGame,
  deserialize,
  Direction,
  GameState,
  hasMoves,
  maxTile,
  move,
  serialize,
  settle,
  spawnTile,
} from './src/game/logic';
import {
  clearBoard,
  loadBest,
  loadBoard,
  loadModeIndex,
  loadMusicOn,
  saveBest,
  saveBoard,
  saveModeIndex,
  saveMusicOn,
} from './src/game/storage';
import { useControls } from './src/hooks/useControls';
import { useSounds } from './src/hooks/useSounds';

function Game() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [modeIndex, setModeIndex] = useState<number | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [best, setBest] = useState(0);
  const [musicOn, setMusicOn] = useState(true);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [gain, setGain] = useState<Gain | null>(null);
  const [confirmingRestart, setConfirmingRestart] = useState(false);

  const gameRef = useRef<GameState | null>(null);
  gameRef.current = game;
  const modeIndexRef = useRef<number | null>(null);
  modeIndexRef.current = modeIndex;
  const confirmingRef = useRef(false);
  confirmingRef.current = confirmingRestart;
  const busy = useRef(false);
  /** one swipe made mid-animation, replayed when the turn finishes */
  const pending = useRef<Direction | null>(null);
  const moveRef = useRef<((direction: Direction) => void) | null>(null);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const gainId = useRef(0);

  const sounds = useSounds(musicOn);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const schedule = useCallback((task: () => void, delay: number) => {
    const id = setTimeout(() => {
      timers.current = timers.current.filter((timer) => timer !== id);
      task();
    }, delay);
    timers.current.push(id);
  }, []);

  /**
   * Keeps gameRef in step with state synchronously: a buffered swipe runs
   * before React re-renders, so it must not read a stale board.
   */
  const commitState = useCallback((next: GameState | null) => {
    gameRef.current = next;
    setGame(next);
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // Restore the player's last mode and music preference.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [savedMode, savedMusic] = await Promise.all([loadModeIndex(0), loadMusicOn()]);
      if (cancelled) {
        return;
      }
      setMusicOn(savedMusic);
      setModeIndex(savedMode >= 0 && savedMode < MODES.length ? savedMode : 0);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Each mode keeps its own saved board and high score.
  useEffect(() => {
    if (modeIndex === null) {
      return;
    }
    let cancelled = false;
    const mode = MODES[modeIndex];
    (async () => {
      const [savedBest, savedBoard] = await Promise.all([
        loadBest(mode.target),
        loadBoard(mode.target),
      ]);
      if (cancelled) {
        return;
      }
      setBest(savedBest);
      commitState(deserialize(savedBoard, mode) ?? createGame(mode));
      busy.current = false;
    })();
    return () => {
      cancelled = true;
    };
  }, [commitState, modeIndex]);

  useEffect(() => {
    if (!game || game.score <= best) {
      return;
    }
    setBest(game.score);
    void saveBest(game.target, game.score);
  }, [game, best]);

  const startFresh = useCallback(() => {
    const index = modeIndexRef.current;
    if (index === null) {
      return;
    }
    const mode = MODES[index];
    const fresh = createGame(mode);
    pending.current = null;
    commitState(fresh);
    busy.current = false;
    void saveBoard(mode.target, serialize(fresh));
  }, [commitState]);

  const lose = useCallback(
    (state: GameState) => {
      sounds.playLose();
      pending.current = null;
      commitState({ ...state, status: 'lost' });
      void clearBoard(state.target);
    },
    [commitState, sounds]
  );

  const handleMove = useCallback(
    (direction: Direction) => {
      const current = gameRef.current;
      if (!current || current.status !== 'playing' || confirmingRef.current) {
        return;
      }
      // mid-animation: remember the swipe instead of dropping it
      if (busy.current) {
        pending.current = direction;
        return;
      }

      const result = move(current, direction);
      if (!result.moved) {
        return;
      }

      busy.current = true;
      commitState(result.state);
      const gained = result.state.score - current.score;
      if (gained > 0) {
        gainId.current += 1;
        setGain({ amount: gained, id: gainId.current });
        sounds.playMatch();
      } else {
        sounds.playMove();
      }

      schedule(() => {
        const settled = settle(result.state);

        // The board stays up behind the dialog; the player decides what's next.
        if (result.reachedTarget && !current.keepPlaying) {
          sounds.playWin();
          pending.current = null;
          commitState({ ...settled, status: 'won' });
          return;
        }

        const next = spawnTile(settled);
        commitState(next);

        if (!hasMoves(next)) {
          lose(next);
          return;
        }

        busy.current = false;
        void saveBoard(next.target, serialize(next));

        const queued = pending.current;
        pending.current = null;
        if (queued) {
          moveRef.current?.(queued);
        }
      }, MOVE_DURATION + 40);
    },
    [commitState, lose, schedule, sounds]
  );

  moveRef.current = handleMove;

  const panHandlers = useControls(handleMove);

  const keepGoing = useCallback(() => {
    const current = gameRef.current;
    if (!current) {
      return;
    }
    // the winning move hasn't dealt its tile yet
    const next = spawnTile({ ...current, status: 'playing', keepPlaying: true });
    if (!hasMoves(next)) {
      lose(next);
      return;
    }
    commitState(next);
    busy.current = false;
    void saveBoard(next.target, serialize(next));
  }, [commitState, lose]);

  const selectMode = useCallback(
    (index: number) => {
      if (index === modeIndexRef.current) {
        return;
      }
      const current = gameRef.current;
      if (current && current.status === 'playing') {
        void saveBoard(current.target, serialize(current));
      }
      clearTimers();
      busy.current = true;
      pending.current = null;
      commitState(null);
      setModeIndex(index);
      void saveModeIndex(index);
    },
    [clearTimers, commitState]
  );

  const restart = useCallback(() => {
    clearTimers();
    pending.current = null;
    setConfirmingRestart(false);
    startFresh();
  }, [clearTimers, startFresh]);

  /** Only ask when there's a game worth losing. */
  const requestNewGame = useCallback(() => {
    const current = gameRef.current;
    if (current && current.status === 'playing' && current.score > 0) {
      setConfirmingRestart(true);
    } else {
      restart();
    }
  }, [restart]);

  const toggleMusic = useCallback(() => {
    setMusicOn((previous) => {
      const next = !previous;
      void saveMusicOn(next);
      return next;
    });
  }, []);

  const onAreaLayout = useCallback((event: LayoutChangeEvent) => {
    const { width: areaWidth, height: areaHeight } = event.nativeEvent.layout;
    setArea({ width: areaWidth, height: areaHeight });
  }, []);

  // Type and control sizes track the smaller screen edge so phones,
  // tablets and landscape all stay in proportion.
  const unit = Math.max(13, Math.min(30, Math.min(width, height) * 0.055));
  const boardSize = Math.floor(Math.min(area.width, area.height));
  const landscape = width > height;
  const mode = MODES[modeIndex ?? 0];
  const bestTile = game ? maxTile(game) : 0;
  const score = game?.score ?? 0;

  // The board sits centred in its area, so the controls would float apart from
  // it. Slide them by half the spare room to keep controls and board together.
  // A transform doesn't change layout, so this can't feed back into `area`.
  const spare = Math.max(0, (landscape ? area.width : area.height) - boardSize);
  const groupShift = landscape
    ? { transform: [{ translateX: spare / 2 }] }
    : { transform: [{ translateY: spare / 2 }] };

  const header = (
    <Header
      unit={unit}
      musicOn={musicOn}
      onToggleMusic={toggleMusic}
      onNewGame={requestNewGame}
    />
  );
  const hud = (
    <>
      <ScoreBar score={score} best={best} unit={unit} vertical={landscape} gain={gain} />
      <GoalPicker
        modes={MODES}
        activeIndex={modeIndex ?? 0}
        onSelect={selectMode}
        unit={unit}
        wrap={landscape}
      />
    </>
  );

  const boardPane = (
    <View style={styles.boardArea} onLayout={onAreaLayout}>
      {/* absolute so the board's size can never feed back into the measured area */}
      <View style={styles.boardCenter}>
        {game && boardSize > 0 ? <Board state={game} boardSize={boardSize} /> : null}
      </View>
    </View>
  );

  let dialog = null;
  if (game?.status === 'won') {
    dialog = (
      <Dialog
        unit={unit}
        hero={<TileFace value={mode.target} size={unit * 4.6} />}
        title={`You made ${mode.target.toLocaleString()}!`}
        message={`Score ${score.toLocaleString()}. Keep going for an even bigger tile, or start a fresh board.`}
        actions={[
          { label: 'Keep going', onPress: keepGoing, primary: true },
          { label: 'New game', onPress: restart },
        ]}
      />
    );
  } else if (game?.status === 'lost') {
    const newBest = score > 0 && score >= best;
    dialog = (
      <Dialog
        unit={unit}
        hero={bestTile > 0 ? <TileFace value={bestTile} size={unit * 3.6} /> : undefined}
        title="No moves left"
        message={
          newBest
            ? `You scored ${score.toLocaleString()}, a new best!`
            : `You scored ${score.toLocaleString()}. Your best is ${best.toLocaleString()}.`
        }
        actions={[{ label: 'Try again', onPress: restart, primary: true }]}
      />
    );
  } else if (confirmingRestart) {
    dialog = (
      <Dialog
        unit={unit}
        title="Start a new game?"
        message={`This board and its score of ${score.toLocaleString()} will be lost.`}
        actions={[
          { label: 'Start new game', onPress: restart, primary: true },
          { label: 'Keep playing', onPress: () => setConfirmingRestart(false) },
        ]}
      />
    );
  }

  return (
    <View style={styles.fill}>
      {/* swipes are handled here so the HUD area is not a dead zone;
          buttons still win the responder because the touch target is asked first */}
      <View
        {...panHandlers}
        style={[
          styles.fill,
          landscape ? styles.row : styles.column,
          {
            paddingTop: insets.top + unit * 0.6,
            paddingBottom: insets.bottom + unit * 0.5,
            paddingLeft: insets.left + unit * 0.7,
            paddingRight: insets.right + unit * 0.7,
            gap: unit * 0.7,
          },
        ]}
      >
        {landscape ? (
          <>
            <View
              style={[
                styles.sidebar,
                { gap: unit * 0.7, width: Math.min(320, width * 0.38) },
                groupShift,
              ]}
            >
              {header}
              {hud}
            </View>
            {boardPane}
          </>
        ) : (
          <>
            <View style={[{ gap: unit * 0.7 }, groupShift]}>
              {header}
              {hud}
            </View>
            {boardPane}
          </>
        )}
      </View>

      {dialog}
      <StatusBar style="dark" />
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });

  return (
    <SafeAreaProvider>
      <LinearGradient
        colors={[THEME.backgroundTop, THEME.backgroundMiddle, THEME.backgroundBottom]}
        locations={[0, 0.45, 1]}
        style={styles.fill}
      >
        {/* a failed font load falls back to the system font rather than a blank screen */}
        {fontsLoaded || fontError ? <Game /> : null}
      </LinearGradient>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  column: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
  },
  sidebar: {
    flexShrink: 0,
    justifyContent: 'center',
  },
  boardArea: {
    flex: 1,
  },
  boardCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
