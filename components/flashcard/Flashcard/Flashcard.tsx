import { Ionicons } from '@expo/vector-icons';
import { GestureResponderEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks';

import { CardStats } from '../CardStats';
import { FlashcardBack } from '../FlashcardBack';

import type { FlashcardProps } from './Flashcard.type';

const ANIMATION_DURATION = 200;

export function Flashcard({ front, back, stats, isRevealed, onReveal }: FlashcardProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const handleAudioPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    front.onAudioPress?.();
  };

  const backAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isRevealed ? 1 : 0, {
      duration: ANIMATION_DURATION,
      easing: Easing.inOut(Easing.ease),
    }),
  }));

  return (
    <Pressable onPress={onReveal} style={styles.container}>
      {/* Word Section - Always visible */}
      <View
        style={[
          styles.wordSection,
          isRevealed && { borderBottomColor: colors.border, borderBottomWidth: 1, paddingHorizontal: Spacing.sm },
        ]}
      >
        <View style={styles.wordRow}>
          <ThemedText style={styles.word}>{front.word}</ThemedText>
          {front.onAudioPress && (
            <Pressable
              onPress={handleAudioPress}
              style={[styles.audioButton, { backgroundColor: colors.surface }]}
              accessibilityLabel='발음 듣기'
            >
              <Ionicons name='volume-medium' size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        {front.phonetic && (
          <ThemedText style={[styles.phonetic, { color: colors.textMuted }]}>{front.phonetic}</ThemedText>
        )}
      </View>

      {/* Answer Section - Only when revealed */}
      <Animated.View style={[styles.answerSection, backAnimatedStyle]}>
        {isRevealed && (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <FlashcardBack
              definition={back.definition}
              examples={back.examples}
              synonyms={back.synonyms}
              highlightWord={front.word}
            />
            {stats && (
              <CardStats reviews={stats.reviews} interval={stats.interval} ease={stats.ease} type={stats.type} />
            )}
          </ScrollView>
        )}
      </Animated.View>

      {/* Subtle divider line - Only when not revealed */}
      {!isRevealed && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  wordSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 42,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  word: {
    fontSize: 36,
    lineHeight: 44,
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
  answerSection: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  divider: {
    height: 1,
    opacity: 0.1,
  },
});
