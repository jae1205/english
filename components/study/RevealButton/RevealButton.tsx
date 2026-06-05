import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks';

import type { RevealButtonProps } from './RevealButton.type';

export function RevealButton({ disabled = false }: RevealButtonProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { width, height } = useWindowDimensions();
  const isCompact = width <= 380 || height <= 740;

  return (
    <View style={[styles.container, { opacity: disabled ? 0.5 : 1 }]}>
      <ThemedText style={[styles.hint, isCompact && styles.hintCompact, { color: colors.borderMuted }]}>
        Tap to reveal answer
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  hint: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  hintCompact: {
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 4,
  },
});
