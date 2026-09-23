// Renders the app icons from the game's own colours and font.
//
// Chrome draws the same candy tiles the game shows, so the icon can never
// drift from the in-game look: the values below come from src/game/config.ts.
//
//   node scripts/make-icons.js
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

const INK_DARK = '#2B2464';
const GRADIENT = 'linear-gradient(160deg, #8EC5FC 0%, #B7B6FC 45%, #E0C3FC 100%)';

// The gold goal tile on its own: one number stays readable at launcher size.
// size and centre offsets are fractions of the canvas.
const TILES = [
  { value: 2048, color: '#FFD83D', ink: INK_DARK, size: 0.62, x: 0, y: -0.015, glow: true },
];

const VARIANTS = [
  { file: 'icon.png', size: 1024, scale: 1, background: true },
  // Android crops an adaptive icon's foreground, so hold the artwork inside
  // the central area it guarantees is visible (a circle over ~61% of the
  // canvas) and leave the gradient to the background layer.
  { file: 'android-icon-foreground.png', size: 512, scale: 0.75, background: false },
  { file: 'android-icon-background.png', size: 512, scale: 0, background: true },
  // Android 13+ themed icons: a flat silhouette the system tints itself.
  { file: 'android-icon-monochrome.png', size: 512, scale: 0.75, background: false, monochrome: true },
  { file: 'favicon.png', size: 96, scale: 1.15, background: true },
  { file: 'store-icon.png', size: 512, scale: 1, background: true },
];

/** src/game/config.ts shade(): the lip is a darker shade of the tile itself. */
function shade(hex, amount) {
  const channel = (offset) =>
    Math.round(parseInt(hex.slice(1 + offset, 3 + offset), 16) * (1 - amount))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

/** src/game/config.ts fontScaleFor(). */
function fontScaleFor(value) {
  const digits = String(value).length;
  if (digits <= 2) return 0.46;
  if (digits === 3) return 0.38;
  if (digits === 4) return 0.3;
  return 0.25;
}

function tileHtml(tile, canvas, showNumber) {
  const side = Math.round(canvas * tile.size);
  const lip = Math.max(2, Math.round(side * 0.06));
  const glow = tile.glow
    ? `, 0 0 ${Math.round(side * 0.32)}px rgba(255, 216, 61, 0.8)`
    : '';
  const style = [
    `width:${side}px`,
    `height:${side}px`,
    `border-radius:${Math.round(side * 0.2)}px`,
    `background:${tile.color}`,
    `box-shadow:0 ${lip}px 0 ${shade(tile.color, 0.22)}${glow}`,
    `margin-left:${Math.round(canvas * tile.x)}px`,
    `margin-top:${Math.round(canvas * tile.y)}px`,
    `font-size:${Math.round(side * (tile.fontScale ?? fontScaleFor(tile.value)))}px`,
    `color:${tile.ink}`,
    tile.corner
      ? `align-items:flex-start;justify-content:flex-start;padding:${Math.round(side * 0.13)}px`
      : '',
  ].join(';');
  return `<div class="tile" style="${style}">${showNumber ? tile.value : ''}</div>`;
}

/**
 * Flat silhouette the system floods with a single colour, so it carries no
 * colour of its own: the tile is solid and its number is knocked out of it.
 * With several tiles, each also erases a gap out of the one behind it.
 */
function monochromeSvg(size, scale) {
  const gap = size * 0.03;
  const shapes = TILES.map((tile, index) => {
    const side = size * tile.size;
    const centerX = size / 2 + size * tile.x;
    const centerY = size / 2 + size * tile.y;
    const left = centerX - side / 2;
    const top = centerY - side / 2;
    const rect = (inset, fill) =>
      `<rect x="${left - inset}" y="${top - inset}" width="${side + inset * 2}" height="${
        side + inset * 2
      }" rx="${side * 0.2 + inset}" fill="${fill}"/>`;
    const fontSize = side * (tile.fontScale ?? fontScaleFor(tile.value));
    // black cuts the gap and the number, white paints the tile between them
    const number = `<text x="${centerX}" y="${centerY}" fill="#000" font-family="Fredoka, sans-serif" font-weight="700" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central">${tile.value}</text>`;
    return (index > 0 ? rect(gap, '#000') : '') + rect(0, '#fff') + number;
  }).join('');
  const half = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <mask id="tiles" maskUnits="userSpaceOnUse" x="0" y="0" width="${size}" height="${size}">
    <g transform="translate(${half} ${half}) scale(${scale}) translate(${-half} ${-half})">${shapes}</g>
  </mask>
  <rect width="${size}" height="${size}" fill="#000" mask="url(#tiles)"/>
</svg>`;
}

function html({ size, scale, background, monochrome }) {
  if (monochrome) {
    return `<!doctype html><meta charset="utf-8">
<style>
  @font-face { font-family: 'Fredoka'; src: url('file:///${FONT}') format('truetype'); font-weight: 700; }
  html,body{margin:0;padding:0;width:${size}px;height:${size}px;background:transparent}
</style>
<body>${monochromeSvg(size, scale)}</body>`;
  }
  // numbers on the small tiles are mush below this size; the goal tile keeps its own
  const showSmallNumbers = size >= 256;
  const tiles = scale
    ? TILES.map((tile) =>
        tileHtml(tile, size, tile.value === 2048 || showSmallNumbers)
      ).join('')
    : '';
  return `<!doctype html>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Fredoka';
    src: url('file:///${FONT}') format('truetype');
    font-weight: 700;
  }
  html, body { margin: 0; padding: 0; width: ${size}px; height: ${size}px; }
  body {
    ${background ? `background: ${GRADIENT};` : 'background: transparent;'}
    display: flex; align-items: center; justify-content: center;
  }
  .group {
    position: relative; width: ${size}px; height: ${size}px;
    transform: scale(${scale || 1});
  }
  .tile {
    position: absolute; left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Fredoka', sans-serif; font-weight: 700; line-height: 1;
  }
</style>
<body><div class="group">${tiles}</div></body>`;
}

const chrome =
  process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const outDir = path.join(root, 'assets');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));

for (const variant of VARIANTS) {
  const page = path.join(tmp, `${variant.file}.html`);
  const out = path.join(tmp, variant.file);
  fs.writeFileSync(page, html(variant));
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--force-device-scale-factor=1',
    '--default-background-color=00000000',
    `--window-size=${variant.size},${variant.size}`,
    // let the font load before the shot
    '--virtual-time-budget=4000',
    `--screenshot=${out}`,
    `file:///${page.replace(/\\/g, '/')}`,
  ]);
  const png = fs.readFileSync(out);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== variant.size || height !== variant.size) {
    throw new Error(`${variant.file}: expected ${variant.size}px, got ${width}x${height}`);
  }
  fs.writeFileSync(path.join(outDir, variant.file), png);
  console.log(`${variant.file.padEnd(30)} ${width}x${height}  ${(png.length / 1024).toFixed(1)} KB`);
}
