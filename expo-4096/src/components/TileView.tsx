import React, { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { tileColor, tileTextColor } from '../game/config';
import { Tile } from '../game/logic';

export const MOVE_DURATION = 120;

type Props = {
  tile: Tile;
  cell: number;
  gap: number;
  pad: number;
};

function offset(index: number, cell: number, gap: number, pad: number) {
  return pad + index * (cell + gap);
}

function fontScaleFor(value: number) {
  const digits = String(value).length;
  if (digits <= 2) return 0.44;
  if (digits === 3) return 0.36;
  if (digits === 4) return 0.29;
  return 0.24;
}

function TileViewComponent({ tile, cell, gap, pad }: Props) {
  const targetX = offset(tile.col, cell, gap, pad);
  const targetY = offset(tile.row, cell, gap, pad);

  const x = useRef(new Animated.Value(targetX)).current;
  const y = useRef(new Animated.Value(targetY)).current;
  const scale = useRef(new Animated.Value(tile.isNew ? 0 : 1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(x, { toValue: targetX, duration: MOVE_DURATION, useNativeDriver: true }),
      Animated.timing(y, { toValue: targetY, duration: MOVE_DURATION, useNativeDriver: true }),
    ]).start();
  }, [targetX, targetY, x, y]);

  useEffect(() => {
    if (!tile.isNew) {
      return;
    }
    scale.setValue(0);
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 170,
      useNativeDriver: true,
    }).start();
  }, [tile.isNew, tile.id, scale]);

  useEffect(() => {
    if (!tile.merged) {
      return;
    }
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.16,
        duration: 90,
        delay: MOVE_DURATION * 0.55,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [tile.merged, tile.value, scale]);

  useEffect(() => {
    if (!tile.removed) {
      return;
    }
    Animated.timing(opacity, {
      toValue: 0,
      duration: MOVE_DURATION,
      useNativeDriver: true,
    }).start();
  }, [tile.removed, opacity]);

  return (
    <Animated.View
      style={[
        styles.tile,
        {
          width: cell,
          height: cell,
          borderRadius: cell * 0.16,
          backgroundColor: tileColor(tile.value),
          opacity,
          transform: [{ translateX: x }, { translateY: y }, { scale }],
        },
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.label,
          {
            color: tileTextColor(tile.value),
            fontSize: cell * fontScaleFor(tile.value),
          },
        ]}
      >
        {tile.value}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  label: {
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export const TileView = memo(TileViewComponent);
