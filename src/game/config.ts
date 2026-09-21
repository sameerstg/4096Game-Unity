export type Mode = {
  label: string;
  target: number;
  size: number;
};

/** Mirrors the Unity dropdown: target picks the board size. */
export const MODES: Mode[] = [
  { label: '2048', target: 2048, size: 4 },
  { label: '4096', target: 4096, size: 5 },
  { label: '8192', target: 8192, size: 5 },
  { label: '16384', target: 16384, size: 6 },
];

/**
 * Candy colours that travel round the wheel from cool teal to warm gold as
 * tiles grow, so bigger reads as warmer. The goal tiles past 2048 are glowing
 * "jewels" that break from the ramp on purpose: they're rare and meant to feel
 * special. Every neighbouring pair is at least 16 ΔE apart, and 2 and 4, the
 * tiles you compare most, sit in different colour families.
 */
export const TILE_COLORS: Record<number, string> = {
  2: '#0E9F94',
  4: '#3F6EF3',
  8: '#7A55F5',
  16: '#A845EE',
  32: '#D63FD0',
  64: '#F2419A',
  128: '#FF4760',
  256: '#FF6B3D',
  512: '#FF921F',
  1024: '#FFB71A',
  2048: '#FFD83D',
  4096: '#2EE59D',
  8192: '#22D3EE',
  16384: '#C084FC',
};

const BEYOND_COLOR = '#FF7CE5';

export const THEME = {
  backgroundTop: '#8EC5FC',
  backgroundMiddle: '#B7B6FC',
  backgroundBottom: '#E0C3FC',
  board: 'rgba(255, 255, 255, 0.72)',
  boardBorder: 'rgba(255, 255, 255, 0.95)',
  emptyCell: 'rgba(95, 84, 190, 0.1)',
  panel: '#FFFFFF',
  panelBorder: 'rgba(95, 84, 190, 0.12)',
  /** the drop under white cards and buttons that gives them their chunky feel */
  lip: 'rgba(80, 70, 170, 0.22)',
  soft: 'rgba(95, 84, 190, 0.1)',
  text: '#2B2464',
  textMuted: '#7A74B8',
  onBackground: 'rgba(43, 36, 100, 0.72)',
  title: '#FFFFFF',
  titleLip: '#5B4FD0',
  accent: '#FF4D8D',
  accentLip: '#D6336C',
  accentText: '#FFFFFF',
  darkText: '#2B2464',
  scrim: 'rgba(43, 36, 100, 0.45)',
  card: '#FFFFFF',
  cardBorder: 'rgba(95, 84, 190, 0.12)',
};

export const FONTS = {
  regular: 'Fredoka_400Regular',
  medium: 'Fredoka_500Medium',
  semibold: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
};

export function tileColor(value: number): string {
  return TILE_COLORS[value] ?? BEYOND_COLOR;
}

/** Darkens a colour toward black, for the lip under a tile. */
export function shade(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const channel = (offset: number) =>
    Math.round(parseInt(clean.slice(offset, offset + 2), 16) * (1 - amount))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

function luminance(hex: string): number {
  const clean = hex.replace('#', '');
  const channel = (offset: number) => {
    const scaled = parseInt(clean.slice(offset, offset + 2), 16) / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/**
 * White text wherever it meets the 3:1 large-text contrast bar, dark text on
 * the bright warm tiles. Choosing whichever contrasts more would flip the
 * colour back and forth on mid-tones where both options are nearly equal.
 */
export function tileTextColor(value: number): string {
  const againstWhite = 1.05 / (luminance(tileColor(value)) + 0.05);
  return againstWhite >= 3 ? '#FFFFFF' : THEME.darkText;
}
