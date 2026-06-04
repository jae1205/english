import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';

import { DeckList } from '@/components/deck';
import { ThemedText } from '@/components/themed-text';
import { Colors, FontFamily, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme, useDecks } from '@/hooks';
import { forceSeedDatabase } from '@/lib/db';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const { decks, isLoading, error, refresh } = useDecks();
  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleDeckPress = (deckId: string) => {
    router.push(`/study/${deckId}`);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleReset = useCallback(async () => {
    if (resetting) return;

    setResetting(true);
    try {
      await forceSeedDatabase();
      await refresh();
    } finally {
      setResetting(false);
    }
  }, [refresh, resetting]);

  // Loading state
  if (isLoading && decks.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Error state
  if (error && decks.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <ThemedText style={styles.errorText}>
          덱을 불러오지 못했습니다
        </ThemedText>
        <ThemedText style={styles.errorMessage}>{error.message}</ThemedText>
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
        },
      ]}
    >
      <View style={styles.header}>
        <ThemedText style={styles.title}>라이브러리</ThemedText>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="학습 데이터 초기화"
            accessibilityRole="button"
            disabled={resetting}
            onPress={handleReset}
            style={[
              styles.resetButton,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                opacity: resetting ? 0.6 : 1,
              },
            ]}
          >
            <Ionicons name="refresh" size={16} color={colors.textSecondary} />
            <ThemedText style={styles.resetButtonText}>
              {resetting ? '초기화 중' : '초기화'}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <DeckList
        decks={decks}
        onDeckPress={handleDeckPress}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontFamily: FontFamily.medium,
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconButton: {
    padding: Spacing.xs,
  },
  resetButton: {
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
  },
  resetButtonText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
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
});
