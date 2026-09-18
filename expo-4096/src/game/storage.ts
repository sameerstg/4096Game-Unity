import AsyncStorage from '@react-native-async-storage/async-storage';

import { SavedBoard } from './logic';

const boardKey = (target: number) => `board:${target}`;
const bestKey = (target: number) => `best:${target}`;
const MODE_KEY = 'mode';
const MUSIC_KEY = 'music';

// Storage is a convenience here: a failure must never take the game down.
async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignored
  }
}

export function loadBoard(target: number): Promise<SavedBoard | null> {
  return readJson<SavedBoard>(boardKey(target));
}

export function saveBoard(target: number, board: SavedBoard): Promise<void> {
  return writeJson(boardKey(target), board);
}

export async function clearBoard(target: number): Promise<void> {
  try {
    await AsyncStorage.removeItem(boardKey(target));
  } catch {
    // ignored
  }
}

export async function loadBest(target: number): Promise<number> {
  const best = await readJson<number>(bestKey(target));
  return typeof best === 'number' && Number.isFinite(best) ? best : 0;
}

export function saveBest(target: number, best: number): Promise<void> {
  return writeJson(bestKey(target), best);
}

export async function loadModeIndex(fallback = 0): Promise<number> {
  const index = await readJson<number>(MODE_KEY);
  return typeof index === 'number' && Number.isInteger(index) ? index : fallback;
}

export function saveModeIndex(index: number): Promise<void> {
  return writeJson(MODE_KEY, index);
}

export async function loadMusicOn(): Promise<boolean> {
  const on = await readJson<boolean>(MUSIC_KEY);
  return typeof on === 'boolean' ? on : true;
}

export function saveMusicOn(on: boolean): Promise<void> {
  return writeJson(MUSIC_KEY, on);
}
