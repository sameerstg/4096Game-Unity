import { useCallback, useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';

const MUSIC = require('../../assets/sounds/music.m4a');
const MOVE = require('../../assets/sounds/move.m4a');
const MATCH = require('../../assets/sounds/match.m4a');
const WIN = require('../../assets/sounds/win.m4a');
const LOSE = require('../../assets/sounds/lose.m4a');

type Player = ReturnType<typeof useAudioPlayer>;

/** Audio is best-effort: an unsupported platform must not break the game. */
function restart(player: Player) {
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // ignored
  }
}

export function useSounds(musicOn: boolean) {
  const music = useAudioPlayer(MUSIC);
  const move = useAudioPlayer(MOVE);
  const match = useAudioPlayer(MATCH);
  const win = useAudioPlayer(WIN);
  const lose = useAudioPlayer(LOSE);

  useEffect(() => {
    try {
      music.loop = true;
      music.volume = 0.32;
      if (musicOn) {
        music.play();
      } else {
        music.pause();
      }
    } catch {
      // ignored
    }
  }, [music, musicOn]);

  return {
    playMove: useCallback(() => restart(move), [move]),
    playMatch: useCallback(() => restart(match), [match]),
    playWin: useCallback(() => restart(win), [win]),
    playLose: useCallback(() => restart(lose), [lose]),
  };
}
