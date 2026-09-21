import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FONTS, Mode, THEME, tileColor, tileTextColor } from '../game/config';

type Props = {
  modes: Mode[];
  activeIndex: number;
  onSelect: (index: number) => void;
  unit: number;
  /** two per row, for the narrow landscape sidebar */
  wrap?: boolean;
};

export function GoalPicker({ modes, activeIndex, onSelect, unit, wrap = false }: Props) {
  return (
    <View style={{ gap: unit * 0.3 }}>
      <Text style={[styles.caption, { fontSize: unit * 0.55 }]}>GOAL</Text>
      <View
        accessibilityRole="radiogroup"
        style={[
          styles.track,
          wrap ? styles.trackWrapped : null,
          { borderRadius: unit * 0.8, padding: unit * 0.2, gap: unit * 0.2 },
        ]}
      >
        {modes.map((mode, index) => {
          const active = index === activeIndex;
          const ink = active ? tileTextColor(mode.target) : THEME.textMuted;
          return (
            <Pressable
              key={mode.target}
              onPress={() => onSelect(index)}
              accessibilityRole="radio"
              accessibilityLabel={`Goal ${mode.label} on a ${mode.size} by ${mode.size} board`}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.option,
                wrap ? styles.optionWrapped : null,
                {
                  borderRadius: unit * 0.6,
                  paddingVertical: unit * 0.3,
                  backgroundColor: active ? tileColor(mode.target) : 'transparent',
                  opacity: pressed && !active ? 0.6 : 1,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.value, { fontSize: unit * 0.78, color: active ? ink : THEME.text }]}
              >
                {mode.label}
              </Text>
              <Text numberOfLines={1} style={[styles.meta, { fontSize: unit * 0.46, color: ink }]}>
                {mode.size}×{mode.size}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: THEME.onBackground,
    fontFamily: FONTS.semibold,
    letterSpacing: 1.5,
  },
  track: {
    flexDirection: 'row',
    backgroundColor: THEME.panel,
    boxShadow: `0px 5px 0px ${THEME.lip}`,
  },
  trackWrapped: {
    flexWrap: 'wrap',
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  optionWrapped: {
    flexGrow: 1,
    flexBasis: '45%',
  },
  value: {
    fontFamily: FONTS.bold,
    includeFontPadding: false,
  },
  meta: {
    fontFamily: FONTS.medium,
    opacity: 0.85,
  },
});
