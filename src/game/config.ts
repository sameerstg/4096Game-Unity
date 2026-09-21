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

/** Tile palette carried over from the Unity GridGenerator colour list. */
export const TILE_COLORS: Record<number, string> = {
  2: '#2ECC71',
  4: '#1ABC9C',
  8: '#00FFD3',
  16: '#3498DB',
  32: '#2980B9',
  64: '#5352ED',
  128: '#F1C40F',
  256: '#F39C12',
  512: '#E67E22',
  1024: '#E74C3C',
  2048: '#FF4757',
  4096: '#FF6B81',
  8192: '#9B59B6',
  16384: '#8E44AD',
};

export const FALLBACK_TILE_COLOR = '#6C5CE7';

export const COLORS = {
  background: '#19E5FF',
  boardFrame: 'rgba(255, 255, 255, 0.24)',
  emptyCell: 'rgba(255, 255, 255, 0.34)',
  panel: 'rgba(255, 255, 255, 0.92)',
  panelText: '#12707F',
  panelValue: '#0B4A55',
  chipIdle: 'rgba(255, 255, 255, 0.3)',
  chipActive: '#FFFFFF',
  chipIdleText: '#FFFFFF',
  chipActiveText: '#0B4A55',
  overlayScrim: 'rgba(3, 40, 48, 0.55)',
  overlayText: '#FFFFFF',
};

export function tileColor(value: number): string {
  return TILE_COLORS[value] ?? FALLBACK_TILE_COLOR;
}

/**
 * Picks dark or light text per tile so every colour in the palette stays
 * readable — the bright cyan and yellow tiles fail against white.
 */
export function tileTextColor(value: number): string {
  const hex = tileColor(value).replace('#', '');
  const channel = (offset: number) => parseInt(hex.slice(offset, offset + 2), 16);
  const linear = (raw: number) => {
    const scaled = raw / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
  };
  const luminance =
    0.2126 * linear(channel(0)) + 0.7152 * linear(channel(2)) + 0.0722 * linear(channel(4));
  return luminance > 0.45 ? '#0B3B45' : '#FFFFFF';
}
