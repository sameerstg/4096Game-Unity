import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { FONTS, shade, tileColor, tileTextColor } from '../game/config';

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function fontScaleFor(value: number) {
  const digits = String(value).length;
  if (digits <= 2) return 0.46;
  if (digits === 3) return 0.38;
  if (digits === 4) return 0.3;
  return 0.25;
}

/**
 * Every tile sits on a lip in a darker shade of its own colour so it reads as a
 * chunky physical block; the goal tiles also glow.
 */
function shadowFor(value: number, size: number): string {
  const color = tileColor(value);
  const lip = `0px ${Math.max(3, size * 0.06)}px 0px ${shade(color, 0.22)}`;
  if (value >= 2048) {
    return `${lip}, 0px 0px ${size * 0.32}px ${withAlpha(color, 0.8)}`;
  }
  return lip;
}

type Props = {
  value: number;
  size: number;
  style?: ViewStyle;
};

export function TileFace({ value, size, style }: Props) {
  const ink = tileTextColor(value);
  return (
    <View
      style={[
        styles.face,
        {
          width: size,
          height: size,
          borderRadius: size * 0.2,
          backgroundColor: tileColor(value),
          boxShadow: shadowFor(value, size),
        },
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.label,
          { color: ink, fontSize: size * fontScaleFor(value) },
          ink === '#FFFFFF'
            ? {
                textShadowColor: shade(tileColor(value), 0.35),
                textShadowOffset: { width: 0, height: Math.max(1, size * 0.02) },
                textShadowRadius: 0,
              }
            : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FONTS.bold,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
