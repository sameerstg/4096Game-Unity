const L = require('../.logic-build/logic.js');
const C = require('../.logic-build/config.js');

let pass = 0;
const failures = [];

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
  } else {
    failures.push(`${name}\n    expected ${e}\n    actual   ${a}`);
  }
}

function stateFrom(rows, target = 2048) {
  const size = rows.length;
  let nextId = 1;
  const tiles = [];
  rows.forEach((row, r) =>
    row.forEach((value, c) => {
      if (value) {
        tiles.push({ id: nextId++, value, row: r, col: c, isNew: false, merged: false, removed: false });
      }
    })
  );
  return { size, target, tiles, score: 0, status: 'playing', nextId };
}

function grid(state) {
  const out = Array.from({ length: state.size }, () => Array(state.size).fill(0));
  L.liveTiles(state).forEach((t) => {
    out[t.row][t.col] = t.value;
  });
  return out;
}

const Z = [0, 0, 0, 0];

// --- merging -------------------------------------------------------------
let r = L.move(stateFrom([[2, 2, 0, 0], Z, Z, Z]), 'left');
check('simple merge left', grid(r.state), [[4, 0, 0, 0], Z, Z, Z]);
check('simple merge score', r.state.score, 4);
check('simple merge counted', [r.moved, r.merges], [true, 1]);

r = L.move(stateFrom([[2, 2, 2, 0], Z, Z, Z]), 'left');
check('no triple merge', grid(r.state), [[4, 2, 0, 0], Z, Z, Z]);

r = L.move(stateFrom([[2, 2, 4, 4], Z, Z, Z]), 'left');
check('two merges in a row', grid(r.state), [[4, 8, 0, 0], Z, Z, Z]);
check('two merges score', r.state.score, 12);

r = L.move(stateFrom([[4, 2, 2, 0], Z, Z, Z]), 'left');
check('merged tile cannot merge again', grid(r.state), [[4, 4, 0, 0], Z, Z, Z]);

r = L.move(stateFrom([[2, 2, 2, 2], Z, Z, Z]), 'left');
check('four equal make two pairs', grid(r.state), [[4, 4, 0, 0], Z, Z, Z]);

// --- direction handling -------------------------------------------------
r = L.move(stateFrom([[0, 0, 2, 2], Z, Z, Z]), 'right');
check('merge right', grid(r.state), [[0, 0, 0, 4], Z, Z, Z]);

r = L.move(stateFrom([[2, 0, 0, 0], [2, 0, 0, 0], Z, Z]), 'up');
check('merge up', grid(r.state), [[4, 0, 0, 0], Z, Z, Z]);

r = L.move(stateFrom([[2, 0, 0, 0], [2, 0, 0, 0], Z, Z]), 'down');
check('merge down', grid(r.state), [Z, Z, Z, [4, 0, 0, 0]]);

r = L.move(stateFrom([[2, 0, 0, 0], Z, Z, Z]), 'right');
check('slide without merge', grid(r.state), [[0, 0, 0, 2], Z, Z, Z]);

// --- blocked moves ------------------------------------------------------
r = L.move(stateFrom([[2, 4, 8, 16], Z, Z, Z]), 'left');
check('blocked row reports no move', r.moved, false);

r = L.move(stateFrom([[2, 4, 8, 16], Z, Z, Z]), 'up');
check('already at edge reports no move', r.moved, false);

// --- win ----------------------------------------------------------------
r = L.move(stateFrom([[4, 4, 0, 0], Z, Z, Z], 8), 'left');
check('reaching target is detected', r.reachedTarget, true);

r = L.move(stateFrom([[2, 2, 0, 0], Z, Z, Z], 8), 'left');
check('below target is not a win', r.reachedTarget, false);

// --- ghosts and settle --------------------------------------------------
r = L.move(stateFrom([[2, 2, 0, 0], Z, Z, Z]), 'left');
check('merge leaves one ghost', r.state.tiles.filter((t) => t.removed).length, 1);
check('ghost slides to the winner cell', r.state.tiles.filter((t) => t.removed).map((t) => [t.row, t.col]), [[0, 0]]);
check('winner is flagged merged', r.state.tiles.filter((t) => t.merged).length, 1);
const settled = L.settle(r.state);
check('settle drops ghosts', settled.tiles.length, 1);
check('settle clears flags', settled.tiles.every((t) => !t.merged && !t.isNew), true);
check('settle keeps the board', grid(settled), [[4, 0, 0, 0], Z, Z, Z]);

// --- game over ----------------------------------------------------------
const deadlocked = stateFrom([
  [2, 4, 2, 4],
  [4, 2, 4, 2],
  [2, 4, 2, 4],
  [4, 2, 4, 2],
]);
check('full board with no pairs has no moves', L.hasMoves(deadlocked), false);

const pairAtBottomEdge = stateFrom([
  [2, 4, 2, 4],
  [4, 2, 4, 2],
  [2, 4, 2, 4],
  [4, 2, 4, 4],
]);
check('pair on the last row is found', L.hasMoves(pairAtBottomEdge), true);

const pairAtTopLeft = stateFrom([
  [2, 2, 2, 4],
  [4, 2, 4, 2],
  [2, 4, 2, 4],
  [4, 2, 4, 2],
]);
check('pair at the origin is found', L.hasMoves(pairAtTopLeft), true);
check('board with a gap has moves', L.hasMoves(stateFrom([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 0]])), true);

// --- spawning -----------------------------------------------------------
const nearlyFull = stateFrom([
  [2, 4, 2, 4],
  [4, 2, 4, 2],
  [2, 4, 2, 4],
  [4, 2, 4, 0],
]);
let spawnOk = true;
for (let i = 0; i < 200; i++) {
  const spawned = L.spawnTile(nearlyFull);
  const fresh = L.liveTiles(spawned).filter((t) => t.isNew);
  if (fresh.length !== 1 || fresh[0].row !== 3 || fresh[0].col !== 3 || fresh[0].value !== 2) {
    spawnOk = false;
    break;
  }
}
check('spawn only uses the free cell', spawnOk, true);
check('spawn on a full board is a no-op', L.liveTiles(L.spawnTile(deadlocked)).length, 16);

const fresh = L.createGame({ label: '2048', target: 2048, size: 4 });
check('new game deals two tiles', fresh.tiles.length, 2);
check('new game tiles are 2s', fresh.tiles.every((t) => t.value === 2), true);
check('new game tiles do not overlap', new Set(fresh.tiles.map((t) => `${t.row},${t.col}`)).size, 2);

// --- ids stay unique across turns ---------------------------------------
let running = L.createGame({ label: '2048', target: 2048, size: 4 });
for (let i = 0; i < 60; i++) {
  const step = L.move(running, ['left', 'up', 'right', 'down'][i % 4]);
  running = L.settle(step.state);
  if (L.hasMoves(running)) {
    running = L.spawnTile(running);
  }
  const ids = running.tiles.map((t) => t.id);
  if (new Set(ids).size !== ids.length) {
    failures.push(`duplicate tile ids after turn ${i}`);
    break;
  }
  const onBoard = running.tiles.every((t) => t.row >= 0 && t.row < 4 && t.col >= 0 && t.col < 4);
  if (!onBoard) {
    failures.push(`tile left the board on turn ${i}`);
    break;
  }
  const cells = L.liveTiles(running).map((t) => `${t.row},${t.col}`);
  if (new Set(cells).size !== cells.length) {
    failures.push(`two tiles share a cell after turn ${i}`);
    break;
  }
}
check('60 turns keep ids unique and cells exclusive', failures.length, 0);

// --- persistence --------------------------------------------------------
const mode = { label: '4096', target: 4096, size: 5 };
const saved = L.serialize(stateFrom([[2, 4, 0, 0, 0], [0, 8, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 16]], 4096));
const restored = L.deserialize(saved, mode);
check('round trip restores the board', grid(restored), [[2, 4, 0, 0, 0], [0, 8, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 16]]);
check('round trip restores ids uniquely', new Set(restored.tiles.map((t) => t.id)).size, 4);
check('board from another size is rejected', L.deserialize(saved, { label: '2048', target: 2048, size: 4 }), null);
check('missing board is rejected', L.deserialize(null, mode), null);
check('empty board is rejected', L.deserialize({ size: 5, score: 0, cells: [] }, mode), null);
check('out of range cell is rejected', L.deserialize({ size: 5, score: 0, cells: [{ value: 2, row: 9, col: 0 }] }, mode), null);
check('garbage value is rejected', L.deserialize({ size: 5, score: 0, cells: [{ value: 0, row: 0, col: 0 }] }, mode), null);

// --- keep playing past the goal -----------------------------------------
check('new game is not in keep-playing mode', L.createGame(mode).keepPlaying, false);
check('max tile of a board', L.maxTile(stateFrom([[2, 64, 0, 0], [8, 0, 0, 0], Z, Z])), 64);
check('max tile of an empty board', L.maxTile(stateFrom([Z, Z, Z, Z])), 0);

const continuing = { ...stateFrom([[4096, 2, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], 4096), keepPlaying: true };
check('keep-playing survives a save', L.deserialize(L.serialize(continuing), mode).keepPlaying, true);
check('not keep-playing survives a save', L.deserialize(L.serialize({ ...continuing, keepPlaying: false }), mode).keepPlaying, false);

const legacyWithGoal = { size: 5, score: 9000, cells: [{ value: 4096, row: 0, col: 0 }, { value: 2, row: 0, col: 1 }] };
const legacyWithoutGoal = { size: 5, score: 100, cells: [{ value: 64, row: 0, col: 0 }] };
check('old save holding the goal tile resumes in keep-playing', L.deserialize(legacyWithGoal, mode).keepPlaying, true);
check('old save below the goal does not', L.deserialize(legacyWithoutGoal, mode).keepPlaying, false);

// --- colour ramp --------------------------------------------------------
function lum(hex) {
  const h = hex.replace('#', '');
  const ch = (o) => {
    const s = parseInt(h.slice(o, o + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
}
const rampValues = Object.keys(C.TILE_COLORS).map(Number).sort((a, b) => a - b);
check('ramp covers 2 to 16384', [rampValues.length, rampValues[0], rampValues[rampValues.length - 1]], [14, 2, 16384]);

function lab(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((o) => {
    const s = parseInt(h.slice(o, o + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047);
  const y = f(r * 0.2126 + g * 0.7152 + b * 0.0722);
  const z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
// ΔE76 of about 2 is the smallest difference the eye notices; tiles you are
// deciding whether to merge need to be far apart.
let closestPair = Infinity;
for (let i = 1; i < rampValues.length; i++) {
  const [a, b] = [lab(C.tileColor(rampValues[i - 1])), lab(C.tileColor(rampValues[i]))];
  const distance = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  if (distance < 15) {
    failures.push(`tiles ${rampValues[i - 1]} and ${rampValues[i]} are only ${distance.toFixed(1)} ΔE apart`);
  }
  closestPair = Math.min(closestPair, distance);
}
check('neighbouring tiles are clearly distinguishable', closestPair >= 15, true);
console.log(`closest neighbouring tiles: ${closestPair.toFixed(1)} ΔE`);

let worstContrast = Infinity;
let worstTile = 0;
for (const value of [...rampValues, 32768]) {
  const a = lum(C.tileColor(value));
  const b = lum(C.tileTextColor(value));
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  if (ratio < worstContrast) {
    worstContrast = ratio;
    worstTile = value;
  }
}
// tile numbers are large bold text, where WCAG AA asks for 3:1
if (worstContrast < 3) {
  failures.push(`tile ${worstTile} text contrast is only ${worstContrast.toFixed(2)}:1`);
}
check('every tile number has at least 3:1 contrast', worstContrast >= 3, true);

const inks = rampValues.map((value) => C.tileTextColor(value));
const switches = inks.filter((ink, i) => i > 0 && ink !== inks[i - 1]).length;
check('tile text goes from white to dark exactly once', [inks[0], switches, inks[inks.length - 1]], ['#FFFFFF', 1, C.THEME.darkText]);
console.log(`text turns dark from tile ${rampValues[inks.findIndex((ink) => ink !== '#FFFFFF')]}`);
console.log(`lowest tile text contrast: ${worstContrast.toFixed(2)}:1 (tile ${worstTile})`);

// --- report -------------------------------------------------------------
console.log(`passed: ${pass}`);
if (failures.length) {
  console.log(`FAILED: ${failures.length}`);
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('ALL LOGIC TESTS PASS');
