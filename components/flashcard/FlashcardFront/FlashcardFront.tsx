import { Ionicons } from '@expo/vector-icons';
import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks';

import type { FlashcardFrontProps } from './FlashcardFront.type';

export function FlashcardFront({
  word,
  phonetic,
  onAudioPress,
}: FlashcardFrontProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const handleAudioPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onAudioPress?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.wordRow}>
        <ThemedText style={styles.word}>{word}</ThemedText>
        {onAudioPress && (
          <Pressable
            onPress={handleAudioPress}
            style={[styles.audioButton, { backgroundColor: colors.surface }]}
            accessibilityLabel="발음 듣기"
          >
            <Ionicons name="volume-medium" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {phonetic && (
        <ThemedText style={[styles.phonetic, { color: colors.textMuted }]}>
          {phonetic}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 96,
    paddingHorizontal: Spacing.lg,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  word: {
    fontSize: 36,
    fontFamily: FontFamily.bold,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  audioButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phonetic: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    marginTop: Spacing.sm,
  },
});
