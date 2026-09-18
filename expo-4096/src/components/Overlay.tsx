import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { COLORS } from '../game/config';

type Props = {
  status: 'won' | 'lost';
  unit: number;
};

/** Scale-up flourish carried over from the iTween banner in the Unity build. */
export function Overlay({ status, unit }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scale.setValue(1);
    Animated.timing(scale, {
      toValue: 1.55,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [status, scale]);

  return (
    <Animated.View style={styles.scrim}>
      <Animated.Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.text, { fontSize: unit * 1.8, transform: [{ scale }] }]}
      >
        {status === 'won' ? 'You Win' : 'You Lost'}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.overlayScrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    pointerEvents: 'none',
  },
  text: {
    color: COLORS.overlayText,
    fontWeight: '900',
    textAlign: 'center',
  },
});
