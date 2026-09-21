import React, { ReactNode, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { FONTS, THEME } from '../game/config';

export type DialogAction = {
  label: string;
  onPress: () => void;
  primary?: boolean;
};

type Props = {
  title: string;
  message?: ReactNode;
  hero?: ReactNode;
  actions: DialogAction[];
  unit: number;
};

export function Dialog({ title, message, hero, actions, unit }: Props) {
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    appear.setValue(0);
    Animated.spring(appear, {
      toValue: 1,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [appear, title]);

  return (
    <Animated.View style={[styles.scrim, { opacity: appear }]}>
      <Animated.View
        accessibilityViewIsModal
        accessibilityRole="alert"
        style={[
          styles.card,
          {
            borderRadius: unit * 1.2,
            padding: unit * 1.2,
            gap: unit * 0.7,
            transform: [
              { scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
            ],
          },
        ]}
      >
        {hero ? <View style={[styles.hero, { marginBottom: unit * 0.3 }]}>{hero}</View> : null}
        <Text style={[styles.title, { fontSize: unit * 1.35 }]}>{title}</Text>
        {message ? (
          <Text style={[styles.message, { fontSize: unit * 0.78, lineHeight: unit * 1.15 }]}>
            {message}
          </Text>
        ) : null}
        <View style={[styles.actions, { gap: unit * 0.5, marginTop: unit * 0.4 }]}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                action.primary ? styles.primary : styles.secondary,
                {
                  borderRadius: unit * 0.7,
                  paddingVertical: unit * 0.6,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.buttonLabel,
                  {
                    fontSize: unit * 0.8,
                    color: action.primary ? THEME.accentText : THEME.text,
                  },
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
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
    backgroundColor: THEME.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    alignItems: 'center',
    boxShadow: `0px 8px 0px ${THEME.lip}`,
  },
  hero: {
    alignItems: 'center',
  },
  title: {
    color: THEME.text,
    fontFamily: FONTS.bold,
    textAlign: 'center',
  },
  message: {
    color: THEME.textMuted,
    fontFamily: FONTS.medium,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: THEME.accent,
    boxShadow: `0px 5px 0px ${THEME.accentLip}`,
  },
  secondary: {
    backgroundColor: THEME.soft,
  },
  buttonLabel: {
    fontFamily: FONTS.bold,
  },
});
