import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FONTS, THEME } from '../game/config';
import { Icon, IconName } from './Icon';

type IconButtonProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  unit: number;
  checked?: boolean;
};

function IconButton({ icon, label, onPress, unit, checked }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={checked === undefined ? 'button' : 'switch'}
      accessibilityLabel={label}
      accessibilityState={checked === undefined ? undefined : { checked }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: unit * 2.1,
          height: unit * 2.1,
          borderRadius: unit * 1.05,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Icon name={icon} size={unit * 1.1} color={THEME.text} />
    </Pressable>
  );
}

type Props = {
  unit: number;
  musicOn: boolean;
  onToggleMusic: () => void;
  onNewGame: () => void;
};

export function Header({ unit, musicOn, onToggleMusic, onNewGame }: Props) {
  return (
    <View style={styles.row}>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[styles.title, { fontSize: unit * 2.1 }]}
      >
        4096
      </Text>
      <View style={[styles.buttons, { gap: unit * 0.45 }]}>
        <IconButton
          icon={musicOn ? 'music' : 'musicOff'}
          label="Music"
          checked={musicOn}
          onPress={onToggleMusic}
          unit={unit}
        />
        <IconButton icon="restart" label="New game" onPress={onNewGame} unit={unit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: THEME.title,
    fontFamily: FONTS.bold,
    includeFontPadding: false,
    // a hard offset shadow gives the chunky, stacked title look
    textShadowColor: THEME.titleLip,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 0,
    flexShrink: 1,
  },
  buttons: {
    flexDirection: 'row',
  },
  iconButton: {
    backgroundColor: THEME.panel,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 4px 0px ${THEME.lip}`,
  },
});
