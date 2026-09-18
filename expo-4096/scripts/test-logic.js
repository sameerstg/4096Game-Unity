const L = require('../.logic-build/logic.js');

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

// --- report -------------------------------------------------------------
console.log(`passed: ${pass}`);
if (failures.length) {
  console.log(`FAILED: ${failures.length}`);
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('ALL LOGIC TESTS PASS');
