import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, Mode } from '../game/config';

type Props = {
  modes: Mode[];
  activeIndex: number;
  onSelectMode: (index: number) => void;
  musicOn: boolean;
  onToggleMusic: () => void;
  onRestart: () => void;
  unit: number;
  /** stack the mode chips above the buttons, for the landscape sidebar */
  stacked?: boolean;
};

export function Controls({
  modes,
  activeIndex,
  onSelectMode,
  musicOn,
  onToggleMusic,
  onRestart,
  unit,
  stacked = false,
}: Props) {
  const button = {
    width: unit * 2,
    height: unit * 2,
    borderRadius: unit,
  };

  return (
    <View
      style={[
        stacked ? styles.stack : styles.row,
        { gap: unit * 0.4 },
      ]}
    >
      <View style={[styles.modes, stacked ? styles.modesWrapped : null, { gap: unit * 0.3 }]}>
        {modes.map((mode, index) => {
          const active = index === activeIndex;
          return (
            <Pressable
              key={mode.target}
              onPress={() => onSelectMode(index)}
              accessibilityRole="button"
              accessibilityLabel={`Target ${mode.label}, ${mode.size} by ${mode.size} board`}
              accessibilityState={{ selected: active }}
              style={[
                styles.chip,
                stacked ? styles.chipWrapped : null,
                {
                  borderRadius: unit * 0.6,
                  paddingVertical: unit * 0.28,
                  backgroundColor: active ? COLORS.chipActive : COLORS.chipIdle,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                  styles.chipLabel,
                  {
                    fontSize: unit * 0.66,
                    color: active ? COLORS.chipActiveText : COLORS.chipIdleText,
                  },
                ]}
              >
                {mode.label}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.chipMeta,
                  {
                    fontSize: unit * 0.44,
                    color: active ? COLORS.chipActiveText : COLORS.chipIdleText,
                  },
                ]}
              >
                {mode.size}×{mode.size}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.buttons, { gap: unit * 0.4 }]}>
        <Pressable
          onPress={onToggleMusic}
          accessibilityRole="switch"
          accessibilityLabel="Music"
          accessibilityState={{ checked: musicOn }}
          style={[styles.iconButton, button]}
        >
          <Text
            style={[styles.icon, { fontSize: unit * 0.95 }, musicOn ? null : styles.iconOff]}
          >
            ♫
          </Text>
        </Pressable>

        <Pressable
          onPress={onRestart}
          accessibilityRole="button"
          accessibilityLabel="New game"
          style={[styles.iconButton, button]}
        >
          <Text style={[styles.icon, { fontSize: unit * 1.05 }]}>↻</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stack: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  modes: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  modesWrapped: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    flexWrap: 'wrap',
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  chipWrapped: {
    flexGrow: 1,
    flexBasis: '40%',
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontWeight: '800',
  },
  chipMeta: {
    fontWeight: '600',
    opacity: 0.75,
  },
  iconButton: {
    backgroundColor: COLORS.chipIdle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: '#FFFFFF',
    fontWeight: '800',
    includeFontPadding: false,
  },
  iconOff: {
    opacity: 0.55,
    textDecorationLine: 'line-through',
  },
});
