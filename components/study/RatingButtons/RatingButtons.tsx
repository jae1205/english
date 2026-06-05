import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Colors, FontFamily, RatingColors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks';

import type { Rating, RatingButtonsProps } from './RatingButtons.type';

const RATING_CONFIG: Record<Rating, { label: string; color: string }> = {
  again: { label: '다시', color: RatingColors.again },
  hard: { label: '어려움', color: RatingColors.hard },
  good: { label: '알맞음', color: RatingColors.good },
  easy: { label: '쉬움', color: RatingColors.easy },
};

const RATINGS: Rating[] = ['again', 'hard', 'good', 'easy'];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface RatingButtonProps {
  rating: Rating;
  interval?: string;
  onPress: () => void;
  disabled: boolean;
}

function RatingButton({ rating, interval, onPress, disabled }: RatingButtonProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { width, height } = useWindowDimensions();
  const isCompact = width <= 380 || height <= 740;
  const config = RATING_CONFIG[rating];
  const scale = useSharedValue(1);
  const isPressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: isPressed.value ? `${config.color}33` : colors.surface,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    isPressed.value = true;
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    isPressed.value = false;
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  return (
    <View style={styles.buttonWrapper}>
      {interval && (
        <ThemedText style={[styles.interval, isCompact && styles.intervalCompact, { color: colors.textMuted }]}>
          {interval}
        </ThemedText>
      )}
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[styles.button, isCompact && styles.buttonCompact, animatedStyle, { opacity: disabled ? 0.5 : 1 }]}
      >
        <ThemedText style={[styles.label, isCompact && styles.labelCompact, { color: config.color }]}>{config.label}</ThemedText>
      </AnimatedPressable>
    </View>
  );
}

export function RatingButtons({ onRate, intervals, disabled = false }: RatingButtonsProps) {
  const { width, height } = useWindowDimensions();
  const isCompact = width <= 380 || height <= 740;

  return (
    <View style={[styles.container, isCompact && styles.containerCompact]}>
      {RATINGS.map((rating) => (
        <RatingButton
          key={rating}
          rating={rating}
          interval={intervals?.[rating]}
          onPress={() => onRate(rating)}
          disabled={disabled}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    gap: 4,
    flexShrink: 0,
  },
  containerCompact: {
    paddingHorizontal: 6,
  },
  buttonWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  interval: {
    fontSize: 10,
    fontFamily: FontFamily.regular,
    marginBottom: 4,
  },
  intervalCompact: {
    fontSize: 9,
    marginBottom: 2,
  },
  button: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: {
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
  },
  label: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
  },
  labelCompact: {
    fontSize: 11,
  },
});
