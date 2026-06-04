import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Flashcard } from '@/components/flashcard';
import { RatingButtons, RevealButton, StudyHeader } from '@/components/study';
import type { Rating } from '@/components/study/RatingButtons';
import { ThemedText } from '@/components/themed-text';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme, useStudySession } from '@/hooks';

function isTextInputTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;

  return (
    element?.tagName === 'INPUT' ||
    element?.tagName === 'TEXTAREA' ||
    element?.isContentEditable === true
  );
}

function normalizeStudyDay(day: string | string[] | undefined): number | undefined {
  const value = Array.isArray(day) ? day[0] : day;
  const numericDay = Number(value);

  return Number.isInteger(numericDay) && numericDay >= 1 && numericDay <= 15 ? numericDay : undefined;
}

export default function StudyScreen() {
  const { deckId, day } = useLocalSearchParams<{ deckId: string; day?: string }>();
  const selectedDay = normalizeStudyDay(day);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const {
    isLoading,
    error,
    currentCard,
    currentIndex,
    totalCards,
    isComplete,
    canUndo,
    intervalPreviews,
    sessionStats,
    submitRating,
    undoRating,
  } = useStudySession(deckId ?? '', selectedDay);

  const [isRevealed, setIsRevealed] = useState(false);

  // Navigate to summary when session is complete
  useEffect(() => {
    if (isComplete && totalCards > 0) {
      router.replace({
        pathname: '/study/summary',
        params: {
          againCount: sessionStats.ratingCounts.again.toString(),
          hardCount: sessionStats.ratingCounts.hard.toString(),
          goodCount: sessionStats.ratingCounts.good.toString(),
          easyCount: sessionStats.ratingCounts.easy.toString(),
        },
      });
    }
  }, [isComplete, totalCards, sessionStats, router]);

  // Reset reveal state when card changes
  useEffect(() => {
    setIsRevealed(false);
  }, [currentCard?.id]);

  useEffect(() => {
    if (!currentCard || typeof window === 'undefined') return;

    const handleSpace = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target) || event.repeat || (event.code !== 'Space' && event.key !== ' ')) {
        return;
      }

      event.preventDefault();
      currentCard.front.onAudioPress?.();
      setIsRevealed(true);
    };

    window.addEventListener('keydown', handleSpace);
    return () => window.removeEventListener('keydown', handleSpace);
  }, [currentCard]);

  const handleClose = () => {
    router.back();
  };

  const handleUndo = async () => {
    await undoRating();
    setIsRevealed(false);
  };

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleRate = async (rating: Rating) => {
    setIsRevealed(false);
    await submitRating(rating);
  };

  useEffect(() => {
    if (!currentCard || !isRevealed || typeof window === 'undefined') return;

    const ratingByKey: Record<string, Rating> = {
      '1': 'again',
      '2': 'hard',
      '3': 'good',
      '4': 'easy',
    };

    const handleRatingKey = (event: KeyboardEvent) => {
      const rating = ratingByKey[event.key];

      if (!rating || event.repeat || isTextInputTarget(event.target)) {
        return;
      }

      event.preventDefault();
      void handleRate(rating);
    };

    window.addEventListener('keydown', handleRatingKey);
    return () => window.removeEventListener('keydown', handleRatingKey);
  }, [currentCard, isRevealed, submitRating]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size='large' color={colors.accent} />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ThemedText style={styles.errorText}>오류가 발생했습니다</ThemedText>
        <ThemedText style={styles.errorMessage}>{error.message}</ThemedText>
      </View>
    );
  }

  // No cards to study
  if (!currentCard) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ThemedText style={styles.emptyText}>학습할 카드가 없습니다</ThemedText>
        <ThemedText style={styles.emptyMessage} onPress={() => router.back()}>
          돌아가기
        </ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <StudyHeader
        current={currentIndex + 1}
        total={totalCards}
        onClose={handleClose}
        onUndo={handleUndo}
        canUndo={canUndo}
      />

      {selectedDay && (
        <View style={[styles.dayBadge, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
          <ThemedText style={[styles.dayBadgeText, { color: colors.textSecondary }]}>Day {selectedDay}</ThemedText>
        </View>
      )}

      <Flashcard
        front={currentCard.front}
        back={currentCard.back}
        stats={currentCard.stats}
        isRevealed={isRevealed}
        onReveal={handleReveal}
      />

      {isRevealed ? <RatingButtons onRate={handleRate} intervals={intervalPreviews ?? undefined} /> : <RevealButton />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontFamily: FontFamily.semiBold,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    opacity: 0.6,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: FontFamily.medium,
    marginBottom: Spacing.md,
  },
  emptyMessage: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    opacity: 0.6,
  },
  dayBadge: {
    alignSelf: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  dayBadgeText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
});
