import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/IconButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks';

import type { StudyHeaderProps } from './StudyHeader.type';

export function StudyHeader({ current, total, onClose, onUndo, canUndo }: StudyHeaderProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { width, height } = useWindowDimensions();
  const isCompact = width <= 380 || height <= 740;

  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <View style={[styles.container, isCompact && styles.containerCompact]}>
      <View style={styles.topRow}>
        <IconButton
          icon={<Ionicons name='close' size={20} color={colors.textMuted} />}
          onPress={onClose}
          accessibilityLabel='학습 종료'
        />

        <View style={styles.progressSection}>
          {!isCompact && <ThemedText style={[styles.label, { color: colors.textMuted }]}>Session Progress</ThemedText>}
          <View style={styles.progressRow}>
            <ThemedText style={[styles.currentCount, { color: colors.accent }]}>{current}</ThemedText>
            <View style={[styles.progressBarWrapper, isCompact && styles.progressBarWrapperCompact]}>
              <ProgressBar progress={progress} height={4} />
            </View>
            <ThemedText style={[styles.totalCount, { color: colors.textMuted }]}>{total}</ThemedText>
          </View>
        </View>

        <IconButton
          icon={<Ionicons name='arrow-undo' size={20} color={canUndo ? colors.textMuted : colors.iconMuted} />}
          onPress={onUndo}
          disabled={!canUndo}
          accessibilityLabel='이전 카드로 돌아가기'
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  containerCompact: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressSection: {
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentCount: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
  },
  progressBarWrapper: {
    width: 96,
  },
  progressBarWrapperCompact: {
    width: 72,
  },
  totalCount: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
  },
});
