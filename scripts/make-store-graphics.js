// Renders the Play Store feature graphic (1024x500) from the game's own
// colours and font, the same way scripts/make-icons.js draws the app icon.
//
//   node scripts/make-store-graphics.js
//
// Set CHROME to override the browser path.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.join(__dirname, '..');
const FONT = path
  .join(root, 'node_modules/@expo-google-fonts/fredoka/700Bold/Fredoka_700Bold.ttf')
  .replace(/\\/g, '/');

const GRADIENT = 'linear-gradient(160deg, #8EC5FC 0%, #B7B6FC 45%, #E0C3FC 100%)';
const INK = '#2B2464';
const TITLE_LIP = '#5B4FD0';

// src/game/config.ts
const TILES = [
  { value: 2, color: '#0E9F94', ink: '#FFFFFF' },
  { value: 32, color: '#D63FD0', ink: '#FFFFFF' },
  { value: 2048, color: '#FFD83D', ink: INK, glow: true },
];

function shade(hex, amount) {
  const channel = (offset) =>
    Math.round(parseInt(hex.slice(1 + offset, 3 + offset), 16) * (1 - amount))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

function fontScaleFor(value) {
  const digits = String(value).length;
  if (digits <= 2) return 0.46;
  if (digits === 3) return 0.38;
  return 0.3;
}

const WIDTH = 1024;
const HEIGHT = 500;
const TILE = 150;

function tile(t) {
  return `<div class="tile" style="
    background:${t.color};
    color:${t.ink};
    font-size:${Math.round(TILE * fontScaleFor(t.value))}px;
    box-shadow:0 ${Math.round(TILE * 0.06)}px 0 ${shade(t.color, 0.22)}${
    t.glow ? `, 0 0 ${Math.round(TILE * 0.3)}px rgba(255,216,61,0.85)` : ''
  };">${t.value}</div>`;
}

const html = `<!doctype html>
<meta charset="utf-8">
<style>
  @font-face { font-family:'Fredoka'; src:url('file:///${FONT}') format('truetype'); font-weight:700; }
  html,body{margin:0;padding:0;width:${WIDTH}px;height:${HEIGHT}px;}
  body{background:${GRADIENT};display:flex;align-items:center;justify-content:center;gap:56px;
       font-family:'Fredoka',sans-serif;font-weight:700;}
  .title{font-size:132px;color:#FFFFFF;line-height:1;
         text-shadow:0 6px 0 ${TITLE_LIP};}
  .sub{font-size:34px;color:${INK};opacity:.75;margin-top:14px;line-height:1.2;}
  .tiles{display:flex;gap:22px;}
  .tile{width:${TILE}px;height:${TILE}px;border-radius:${Math.round(TILE * 0.2)}px;
        display:flex;align-items:center;justify-content:center;line-height:1;}
</style>
<body>
  <div>
    <div class="title">4096</div>
    <div class="sub">Merge the numbers.<br>Reach the goal.</div>
  </div>
  <div class="tiles">${TILES.map(tile).join('')}</div>
</body>`;

const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const outDir = path.join(root, 'store');
fs.mkdirSync(outDir, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'store-'));
const page = path.join(tmp, 'feature.html');
const out = path.join(outDir, 'feature-graphic.png');
fs.writeFileSync(page, html);

execFileSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--allow-file-access-from-files',
  '--force-device-scale-factor=1',
  `--window-size=${WIDTH},${HEIGHT}`,
  '--virtual-time-budget=4000',
  `--screenshot=${out}`,
  `file:///${page.replace(/\\/g, '/')}`,
]);

const png = fs.readFileSync(out);
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
if (width !== WIDTH || height !== HEIGHT) {
  throw new Error(`feature graphic: expected ${WIDTH}x${HEIGHT}, got ${width}x${height}`);
}
console.log(`store/feature-graphic.png  ${width}x${height}  ${(png.length / 1024).toFixed(1)} KB`);
