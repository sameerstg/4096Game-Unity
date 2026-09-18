import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { Board } from './src/components/Board';
import { Controls } from './src/components/Controls';
import { Overlay } from './src/components/Overlay';
import { ScoreBar } from './src/components/ScoreBar';
import { MOVE_DURATION } from './src/components/TileView';
import { COLORS, MODES } from './src/game/config';
import {
  createGame,
  deserialize,
  Direction,
  GameState,
  hasMoves,
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

/** Matches the Unity banner: show the result, then deal a new board. */
const RESULT_PAUSE = 2000;

function Game() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [modeIndex, setModeIndex] = useState<number | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [best, setBest] = useState(0);
  const [musicOn, setMusicOn] = useState(true);
  const [area, setArea] = useState({ width: 0, height: 0 });

  const gameRef = useRef<GameState | null>(null);
  gameRef.current = game;
  const modeIndexRef = useRef<number | null>(null);
  modeIndexRef.current = modeIndex;
  const busy = useRef(false);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const sounds = useSounds(musicOn);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const schedule = useCallback((task: () => void, delay: number) => {
    timers.current.push(setTimeout(task, delay));
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
      setGame(deserialize(savedBoard, mode) ?? createGame(mode));
      busy.current = false;
    })();
    return () => {
      cancelled = true;
    };
  }, [modeIndex]);

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
    setGame(fresh);
    busy.current = false;
    void saveBoard(mode.target, serialize(fresh));
  }, []);

  const finish = useCallback(
    (state: GameState, status: 'won' | 'lost') => {
      setGame({ ...state, status });
      void clearBoard(state.target);
      schedule(startFresh, RESULT_PAUSE);
    },
    [schedule, startFresh]
  );

  const handleMove = useCallback(
    (direction: Direction) => {
      const current = gameRef.current;
      if (!current || busy.current || current.status !== 'playing') {
        return;
      }

      const result = move(current, direction);
      if (!result.moved) {
        return;
      }

      busy.current = true;
      setGame(result.state);
      if (result.merges > 0) {
        sounds.playMatch();
      } else {
        sounds.playMove();
      }

      schedule(() => {
        const settled = settle(result.state);

        if (result.reachedTarget) {
          sounds.playWin();
          finish(settled, 'won');
          return;
        }

        const next = spawnTile(settled);
        setGame(next);

        if (!hasMoves(next)) {
          sounds.playLose();
          finish(next, 'lost');
          return;
        }

        busy.current = false;
        void saveBoard(next.target, serialize(next));
      }, MOVE_DURATION + 40);
    },
    [finish, schedule, sounds]
  );

  const panHandlers = useControls(handleMove);

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
      setGame(null);
      setModeIndex(index);
      void saveModeIndex(index);
    },
    [clearTimers]
  );

  const restart = useCallback(() => {
    clearTimers();
    startFresh();
  }, [clearTimers, startFresh]);

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

  const hud = (
    <>
      <ScoreBar score={game?.score ?? 0} best={best} unit={unit} vertical={landscape} />
      <Controls
        modes={MODES}
        activeIndex={modeIndex ?? 0}
        onSelectMode={selectMode}
        musicOn={musicOn}
        onToggleMusic={toggleMusic}
        onRestart={restart}
        unit={unit}
        stacked={landscape}
      />
    </>
  );

  const boardPane = (
    <View style={styles.boardArea} onLayout={onAreaLayout} {...panHandlers}>
      {/* absolute so the board's size can never feed back into the measured area */}
      <View style={styles.boardCenter}>
        {game && boardSize > 0 ? <Board state={game} boardSize={boardSize} /> : null}
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.root,
        landscape ? styles.rootLandscape : styles.rootPortrait,
        {
          paddingTop: insets.top + unit * 0.5,
          paddingBottom: insets.bottom + unit * 0.5,
          paddingLeft: insets.left + unit * 0.6,
          paddingRight: insets.right + unit * 0.6,
          gap: unit * 0.55,
        },
      ]}
    >
      {landscape ? (
        <View
          style={[
            styles.sidebar,
            { gap: unit * 0.55, width: Math.min(300, width * 0.36) },
          ]}
        >
          {hud}
        </View>
      ) : (
        hud
      )}

      {boardPane}

      {game && game.status !== 'playing' ? (
        <Overlay status={game.status} unit={unit} />
      ) : null}

      <StatusBar style="dark" />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  rootPortrait: {
    flexDirection: 'column',
  },
  rootLandscape: {
    flexDirection: 'row',
  },
  sidebar: {
    flexShrink: 0,
    justifyContent: 'center',
  },
  boardArea: {
    flex: 1,
    overflow: 'hidden',
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
