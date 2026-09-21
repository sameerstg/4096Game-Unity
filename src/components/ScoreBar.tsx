import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../game/config';

type PillProps = {
  label: string;
  value: number;
  unit: number;
  vertical?: boolean;
};

function Pill({ label, value, unit, vertical = false }: PillProps) {
  return (
    <View
      style={[
        styles.pill,
        // stacked pills size to their content instead of splitting a row
        vertical ? styles.pillStacked : null,
        { borderRadius: unit * 0.9, paddingVertical: unit * 0.4 },
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.label, { fontSize: unit * 0.62 }]}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.value, { fontSize: unit * 1.15 }]}
      >
        {value}
      </Text>
    </View>
  );
}

type Props = {
  score: number;
  best: number;
  unit: number;
  vertical?: boolean;
};

export function ScoreBar({ score, best, unit, vertical = false }: Props) {
  return (
    <View style={[vertical ? styles.column : styles.row, { gap: unit * 0.5 }]}>
      <Pill label="SCORE" value={score} unit={unit} vertical={vertical} />
      <Pill label="HIGH SCORE" value={best} unit={unit} vertical={vertical} />
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
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pillStacked: {
    // `flex: 0` becomes `flex: 0 1 0%` on web and collapses the height
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    alignSelf: 'stretch',
  },
  label: {
    color: COLORS.panelText,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  value: {
    color: COLORS.panelValue,
    fontWeight: '900',
  },
});
