// Captures Play Store phone screenshots of the running game.
//
// Needs the web build serving first:
//   npx expo start --web --port 8083
//   node scripts/make-screenshots.js
//
// public/shot.html lays the game out at a phone width and scales it 3x, so
// each file is exactly 1080x1920 — the 9:16 ratio Play asks for. Don't force a
// device scale factor instead: Chrome clamps a small window to a larger one and
// the shot comes out cropped. shot.html also seeds the board for each scene.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'store', 'screenshots');
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = process.env.PORT || '8083';

const SCENES = [
  { name: '1-midgame', scene: 'mid' },
  { name: '2-late', scene: 'big' },
  { name: '3-win', scene: 'win' },
  { name: '4-big-board', scene: 'six' },
];

fs.mkdirSync(outDir, { recursive: true });

for (const { name, scene } of SCENES) {
  const out = path.join(outDir, `${name}.png`);
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--window-size=1080,1920',
    // long enough for fonts, the board animation and any scripted key press
    '--virtual-time-budget=9000',
    `--screenshot=${out}`,
    `http://localhost:${port}/shot.html?s=${scene}`,
  ]);
  const png = fs.readFileSync(out);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== 1080 || height !== 1920) {
    throw new Error(`${name}: expected 1080x1920, got ${width}x${height}`);
  }
  console.log(`${name.padEnd(14)} ${width}x${height}  ${(png.length / 1024).toFixed(0)} KB`);
}
