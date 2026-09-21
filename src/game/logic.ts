import { Mode } from './config';

export type Direction = 'up' | 'down' | 'left' | 'right';

export type Tile = {
  id: number;
  value: number;
  row: number;
  col: number;
  /** spawned this turn — plays the pop-in animation */
  isNew: boolean;
  /** grew this turn — plays the bounce animation */
  merged: boolean;
  /** absorbed by a merge — slides into the winner, then is dropped */
  removed: boolean;
};

export type Status = 'playing' | 'won' | 'lost';

export type GameState = {
  size: number;
  target: number;
  tiles: Tile[];
  score: number;
  status: Status;
  nextId: number;
  /** the player chose to carry on after reaching the goal */
  keepPlaying: boolean;
};

export type MoveResult = {
  state: GameState;
  moved: boolean;
  merges: number;
  reachedTarget: boolean;
};

const VECTORS: Record<Direction, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

/** New tiles are always 2, matching the Unity original. */
const SPAWN_VALUE = 2;

export function liveTiles(state: GameState): Tile[] {
  return state.tiles.filter((tile) => !tile.removed);
}

export function maxTile(state: GameState): number {
  return liveTiles(state).reduce((best, tile) => Math.max(best, tile.value), 0);
}

function occupiedKeys(state: GameState): Set<number> {
  return new Set(liveTiles(state).map((tile) => tile.row * state.size + tile.col));
}

export function spawnTile(state: GameState): GameState {
  const taken = occupiedKeys(state);
  const free: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < state.size; row++) {
    for (let col = 0; col < state.size; col++) {
      if (!taken.has(row * state.size + col)) {
        free.push({ row, col });
      }
    }
  }
  if (free.length === 0) {
    return state;
  }
  const spot = free[Math.floor(Math.random() * free.length)];
  const tile: Tile = {
    id: state.nextId,
    value: SPAWN_VALUE,
    row: spot.row,
    col: spot.col,
    isNew: true,
    merged: false,
    removed: false,
  };
  return { ...state, tiles: [...state.tiles, tile], nextId: state.nextId + 1 };
}

export function createGame(mode: Mode): GameState {
  const empty: GameState = {
    size: mode.size,
    target: mode.target,
    tiles: [],
    score: 0,
    status: 'playing',
    nextId: 1,
    keepPlaying: false,
  };
  return spawnTile(spawnTile(empty));
}

/** Drops absorbed tiles and clears the one-turn animation flags. */
export function settle(state: GameState): GameState {
  return {
    ...state,
    tiles: liveTiles(state).map((tile) => ({
      ...tile,
      isNew: false,
      merged: false,
    })),
  };
}

export function move(state: GameState, direction: Direction): MoveResult {
  const { size } = state;
  const vector = VECTORS[direction];

  const tiles = liveTiles(state).map((tile) => ({ ...tile, isNew: false, merged: false }));
  const grid: Array<Array<Tile | null>> = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  );
  tiles.forEach((tile) => {
    grid[tile.row][tile.col] = tile;
  });

  // Tiles nearest the edge being pushed toward have to settle first.
  const order = [...tiles].sort((a, b) => {
    if (vector.dr !== 0) {
      return vector.dr > 0 ? b.row - a.row : a.row - b.row;
    }
    return vector.dc > 0 ? b.col - a.col : a.col - b.col;
  });

  const inBounds = (row: number, col: number) =>
    row >= 0 && row < size && col >= 0 && col < size;

  const ghosts: Tile[] = [];
  const alreadyMerged = new Set<number>();
  let moved = false;
  let merges = 0;
  let gained = 0;

  for (const tile of order) {
    let row = tile.row;
    let col = tile.col;

    while (inBounds(row + vector.dr, col + vector.dc) && grid[row + vector.dr][col + vector.dc] === null) {
      row += vector.dr;
      col += vector.dc;
    }

    const aheadRow = row + vector.dr;
    const aheadCol = col + vector.dc;
    const blocker = inBounds(aheadRow, aheadCol) ? grid[aheadRow][aheadCol] : null;

    if (blocker && blocker.value === tile.value && !alreadyMerged.has(blocker.id)) {
      grid[tile.row][tile.col] = null;
      blocker.value *= 2;
      blocker.merged = true;
      alreadyMerged.add(blocker.id);
      gained += blocker.value;
      merges += 1;
      moved = true;
      ghosts.push({ ...tile, row: blocker.row, col: blocker.col, removed: true });
      continue;
    }

    if (row !== tile.row || col !== tile.col) {
      grid[tile.row][tile.col] = null;
      tile.row = row;
      tile.col = col;
      grid[row][col] = tile;
      moved = true;
    }
  }

  const survivors = tiles.filter((tile) => grid[tile.row][tile.col] === tile);
  const reachedTarget = survivors.some((tile) => tile.value >= state.target);

  return {
    state: {
      ...state,
      // ghosts render beneath the survivors so the merge reads correctly
      tiles: [...ghosts, ...survivors],
      score: state.score + gained,
    },
    moved,
    merges,
    reachedTarget,
  };
}

export function hasMoves(state: GameState): boolean {
  const { size } = state;
  const grid: Array<Array<Tile | null>> = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  );
  liveTiles(state).forEach((tile) => {
    grid[tile.row][tile.col] = tile;
  });

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const tile = grid[row][col];
      if (!tile) {
        return true;
      }
      if (row + 1 < size && grid[row + 1][col]?.value === tile.value) {
        return true;
      }
      if (col + 1 < size && grid[row][col + 1]?.value === tile.value) {
        return true;
      }
    }
  }
  return false;
}

export type SavedBoard = {
  size: number;
  score: number;
  cells: Array<{ value: number; row: number; col: number }>;
  keepPlaying?: boolean;
};

export function serialize(state: GameState): SavedBoard {
  return {
    size: state.size,
    score: state.score,
    cells: liveTiles(state).map(({ value, row, col }) => ({ value, row, col })),
    keepPlaying: state.keepPlaying,
  };
}

export function deserialize(saved: SavedBoard | null, mode: Mode): GameState | null {
  if (!saved || saved.size !== mode.size || !Array.isArray(saved.cells) || saved.cells.length === 0) {
    return null;
  }
  const valid = saved.cells.every(
    (cell) =>
      Number.isFinite(cell.value) &&
      cell.value >= SPAWN_VALUE &&
      cell.row >= 0 &&
      cell.row < mode.size &&
      cell.col >= 0 &&
      cell.col < mode.size
  );
  if (!valid) {
    return null;
  }

  let nextId = 1;
  const tiles: Tile[] = saved.cells.map((cell) => ({
    id: nextId++,
    value: cell.value,
    row: cell.row,
    col: cell.col,
    isNew: false,
    merged: false,
    removed: false,
  }));

  return {
    size: mode.size,
    target: mode.target,
    tiles,
    score: Number.isFinite(saved.score) ? saved.score : 0,
    status: 'playing',
    nextId,
    // Older saves lack the flag; a saved board that already holds the goal
    // tile can only come from a player who chose to keep going.
    keepPlaying:
      typeof saved.keepPlaying === 'boolean'
        ? saved.keepPlaying
        : saved.cells.some((cell) => cell.value >= mode.target),
  };
}
