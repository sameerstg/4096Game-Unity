import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { FONTS, THEME } from '../game/config';

export type Gain = {
  amount: number;
  id: number;
};

type PillProps = {
  label: string;
  value: number;
  unit: number;
  vertical: boolean;
  gain?: Gain | null;
};

function GainPop({ gain, unit }: { gain: Gain; unit: number }) {
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    rise.setValue(0);
    Animated.timing(rise, { toValue: 1, duration: 750, useNativeDriver: true }).start();
  }, [gain.id, rise]);

  return (
    <Animated.Text
      style={[
        styles.gain,
        {
          fontSize: unit * 0.85,
          opacity: rise.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
          transform: [
            { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, -unit * 1.6] }) },
          ],
        },
      ]}
    >
      +{gain.amount}
    </Animated.Text>
  );
}

function Pill({ label, value, unit, vertical, gain }: PillProps) {
  return (
    <View
      style={[
        styles.pill,
        vertical ? styles.pillStacked : null,
        { borderRadius: unit * 0.8, paddingVertical: unit * 0.35 },
      ]}
    >
      <Text numberOfLines={1} style={[styles.label, { fontSize: unit * 0.55 }]}>
        {label}
      </Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.value, { fontSize: unit * 1.2 }]}>
        {value.toLocaleString()}
      </Text>
      {gain ? <GainPop key={gain.id} gain={gain} unit={unit} /> : null}
    </View>
  );
}

type Props = {
  score: number;
  best: number;
  unit: number;
  vertical?: boolean;
  gain?: Gain | null;
};

export function ScoreBar({ score, best, unit, vertical = false, gain }: Props) {
  return (
    <View style={[vertical ? styles.column : styles.row, { gap: unit * 0.5 }]}>
      <Pill label="SCORE" value={score} unit={unit} vertical={vertical} gain={gain} />
      <Pill label="BEST" value={best} unit={unit} vertical={vertical} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  column: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  pill: {
    flex: 1,
    backgroundColor: THEME.panel,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    boxShadow: `0px 5px 0px ${THEME.lip}`,
  },
  pillStacked: {
    // `flex: 0` becomes `flex: 0 1 0%` on web and collapses the height
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    alignSelf: 'stretch',
  },
  label: {
    color: THEME.textMuted,
    fontFamily: FONTS.semibold,
    letterSpacing: 1.5,
  },
  value: {
    color: THEME.text,
    fontFamily: FONTS.bold,
    includeFontPadding: false,
  },
  gain: {
    position: 'absolute',
    right: 10,
    top: 4,
    color: THEME.accent,
    fontFamily: FONTS.bold,
    pointerEvents: 'none',
  },
});
