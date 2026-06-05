import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Flashcard } from '@/components/flashcard';
import { RatingButtons, RevealButton, StudyHeader } from '@/components/study';
import type { Rating } from '@/components/study/RatingButtons';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme, useStudySession } from '@/hooks';
import { speakWord } from '@/lib/audio/speech';
import {
  buildOptions,
  buildTestQuestions,
  getCardAudioId,
  getPracticeCards,
  shuffleItems,
  type PracticeCard,
  type TestQuestion,
} from '@/lib/study-practice';

type StudyMode = 'flashcards' | 'learn' | 'test' | 'match';
type AppColors = (typeof Colors)[keyof typeof Colors];

interface ModeOption {
  id: StudyMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface MatchTile {
  tileId: string;
  cardId: string;
  kind: 'word' | 'definition';
  text: string;
}

const MODE_OPTIONS: ModeOption[] = [
  { id: 'flashcards', label: '카드', icon: 'albums-outline' },
  { id: 'learn', label: '학습', icon: 'school-outline' },
  { id: 'test', label: '테스트', icon: 'checkbox-outline' },
  { id: 'match', label: '매칭', icon: 'grid-outline' },
];

function useVisualViewportSize() {
  const [viewport, setViewport] = useState({ height: 0, offsetTop: 0 });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const updateViewport = () => {
      setViewport({
        height: window.visualViewport?.height ?? 0,
        offsetTop: window.visualViewport?.offsetTop ?? 0,
      });
    };

    updateViewport();
    window.visualViewport.addEventListener('resize', updateViewport);
    window.visualViewport.addEventListener('scroll', updateViewport);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, []);

  return viewport;
}

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

function createMatchTiles(cards: PracticeCard[]): MatchTile[] {
  return shuffleItems(cards)
    .slice(0, Math.min(6, cards.length))
    .flatMap((card) => [
      {
        tileId: `${card.id}-word`,
        cardId: card.id,
        kind: 'word' as const,
        text: card.word,
      },
      {
        tileId: `${card.id}-definition`,
        cardId: card.id,
        kind: 'definition' as const,
        text: card.definition,
      },
    ]);
}

export default function StudyScreen() {
  const { deckId, day } = useLocalSearchParams<{ deckId: string; day?: string }>();
  const selectedDay = normalizeStudyDay(day);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const visualViewport = useVisualViewportSize();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const isMobileViewport = width <= 600;
  const visibleHeight = visualViewport.height > 0 ? visualViewport.height : height;
  const browserChromeInset = isMobileViewport
    ? Math.max(0, height - visibleHeight - visualViewport.offsetTop)
    : 0;
  const isCompactViewport = width <= 380 || visibleHeight <= 760;
  const isFlipViewport = isMobileViewport && width <= 380;
  const bottomPadding = isMobileViewport
    ? Math.max(insets.bottom + browserChromeInset + 64, isFlipViewport ? 132 : 96)
    : insets.bottom + Spacing.xl;
  const practiceCards = useMemo(() => getPracticeCards(selectedDay), [selectedDay]);

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
    goToPreviousCard,
    goToNextCard,
  } = useStudySession(deckId ?? '', selectedDay);

  const [activeMode, setActiveMode] = useState<StudyMode>('flashcards');
  const [isRevealed, setIsRevealed] = useState(false);

  const handleClose = useCallback(() => {
    router.replace('/');
  }, [router]);

  useEffect(() => {
    if (activeMode === 'flashcards' && isComplete && totalCards > 0) {
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
  }, [activeMode, isComplete, totalCards, sessionStats, router]);

  useEffect(() => {
    setIsRevealed(false);
  }, [currentCard?.id, activeMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isTextInputTarget(event.target)) {
        return;
      }

      event.preventDefault();
      handleClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [handleClose]);

  useEffect(() => {
    if (activeMode !== 'flashcards' || !currentCard || typeof window === 'undefined') return;

    const handleNavigationKey = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target) || event.repeat) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPreviousCard();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNextCard();
      }
    };

    const handleSpace = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target) || event.repeat || (event.code !== 'Space' && event.key !== ' ')) {
        return;
      }

      event.preventDefault();
      currentCard.front.onAudioPress?.();
      setIsRevealed(true);
    };

    window.addEventListener('keydown', handleNavigationKey);
    window.addEventListener('keydown', handleSpace);
    return () => {
      window.removeEventListener('keydown', handleNavigationKey);
      window.removeEventListener('keydown', handleSpace);
    };
  }, [activeMode, currentCard, goToPreviousCard, goToNextCard]);

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
    if (activeMode !== 'flashcards' || !currentCard || !isRevealed || typeof window === 'undefined') return;

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
  }, [activeMode, currentCard, isRevealed, submitRating]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ThemedText style={styles.errorText}>오류가 발생했습니다</ThemedText>
        <ThemedText style={styles.errorMessage}>{error.message}</ThemedText>
      </View>
    );
  }

  if (activeMode === 'flashcards' && !currentCard) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ThemedText style={styles.emptyText}>학습할 카드가 없습니다</ThemedText>
        <ThemedText style={styles.emptyMessage} onPress={handleClose}>
          돌아가기
        </ThemedText>
      </View>
    );
  }

  const headerCurrent = activeMode === 'flashcards' ? currentIndex + 1 : practiceCards.length;
  const headerTotal = activeMode === 'flashcards' ? totalCards : practiceCards.length;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: bottomPadding,
        },
      ]}
    >
      <StudyHeader
        current={headerCurrent}
        total={headerTotal}
        onClose={handleClose}
        onUndo={handleUndo}
        canUndo={activeMode === 'flashcards' && canUndo}
      />

      <View style={[styles.topControls, isMobileViewport && styles.topControlsMobile]}>
        {selectedDay && (
          <View style={[styles.dayBadge, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
            <ThemedText style={[styles.dayBadgeText, { color: colors.textSecondary }]}>Day {selectedDay}</ThemedText>
          </View>
        )}

        <ModeTabs activeMode={activeMode} colors={colors} compact={isCompactViewport} onChange={setActiveMode} />
      </View>

      {activeMode === 'flashcards' && currentCard && (
        <>
          <View style={styles.flashcardShell}>
            <Flashcard
              front={currentCard.front}
              back={currentCard.back}
              stats={currentCard.stats}
              isRevealed={isRevealed}
              onReveal={handleReveal}
            />
          </View>

          {isRevealed ? (
            <RatingButtons onRate={handleRate} intervals={intervalPreviews ?? undefined} />
          ) : (
            <RevealButton />
          )}
        </>
      )}

      {activeMode === 'learn' && <LearnMode cards={practiceCards} colors={colors} compact={isCompactViewport} />}
      {activeMode === 'test' && <TestMode cards={practiceCards} colors={colors} compact={isCompactViewport} />}
      {activeMode === 'match' && <MatchMode cards={practiceCards} colors={colors} compact={isCompactViewport} />}
    </View>
  );
}

function ModeTabs({
  activeMode,
  colors,
  compact,
  onChange,
}: {
  activeMode: StudyMode;
  colors: AppColors;
  compact: boolean;
  onChange: (mode: StudyMode) => void;
}) {
  return (
    <View style={[styles.modeTabs, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      {MODE_OPTIONS.map((mode) => {
        const isActive = activeMode === mode.id;

        return (
          <Pressable
            key={mode.id}
            accessibilityRole="button"
            accessibilityLabel={`${mode.label} 모드`}
            onPress={() => onChange(mode.id)}
            style={[styles.modeTab, compact && styles.modeTabCompact, isActive && { backgroundColor: colors.accent }]}
          >
            <Ionicons name={mode.icon} size={compact ? 14 : 16} color={isActive ? '#000000' : colors.textMuted} />
            <ThemedText style={[styles.modeTabText, compact && styles.modeTabTextCompact, { color: isActive ? '#000000' : colors.textSecondary }]}>
              {mode.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function LearnMode({ cards, colors, compact }: { cards: PracticeCard[]; colors: AppColors; compact: boolean }) {
  const [queue, setQueue] = useState<PracticeCard[]>(() => shuffleItems(cards));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [missCount, setMissCount] = useState(0);

  useEffect(() => {
    setQueue(shuffleItems(cards));
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setCorrectCount(0);
    setMissCount(0);
  }, [cards]);

  const currentCard = queue[currentIndex];
  const options = useMemo(
    () => (currentCard ? buildOptions(cards, currentCard.definition, 'definition') : []),
    [cards, currentCard?.id]
  );
  const isComplete = !currentCard;
  const isCorrect = selectedAnswer === currentCard?.definition;

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
  };

  const handleNext = () => {
    if (!currentCard || !selectedAnswer) return;

    if (selectedAnswer === currentCard.definition) {
      setCorrectCount((value) => value + 1);
    } else {
      setMissCount((value) => value + 1);
      setQueue((value) => [...value, currentCard]);
    }

    setSelectedAnswer(null);
    setCurrentIndex((value) => value + 1);
  };

  const handleRestart = () => {
    setQueue(shuffleItems(cards));
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setCorrectCount(0);
    setMissCount(0);
  };

  if (isComplete) {
    return (
      <ModeScrollBody compact={compact}>
        <View style={[styles.resultPanel, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <ThemedText style={styles.resultTitle}>학습 완료</ThemedText>
          <View style={styles.scoreRow}>
            <ScorePill label="맞힘" value={correctCount} color={colors.success} />
            <ScorePill label="복습" value={missCount} color={colors.warning} />
          </View>
          <ActionButton label="다시 학습" icon="refresh" colors={colors} onPress={handleRestart} />
        </View>
      </ModeScrollBody>
    );
  }

  return (
    <ModeScrollBody compact={compact}>
      <View style={[styles.practicePanel, compact && styles.practicePanelCompact, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.panelHeader}>
          <ThemedText style={[styles.panelLabel, { color: colors.textMuted }]}>학습</ThemedText>
          <ThemedText style={[styles.panelCounter, { color: colors.textMuted }]}>
            {Math.min(currentIndex + 1, queue.length)} / {queue.length}
          </ThemedText>
        </View>

        <View style={styles.promptBlock}>
          <View style={styles.wordLine}>
            <ThemedText style={[styles.promptWord, compact && styles.promptWordCompact]}>{currentCard.word}</ThemedText>
            <Pressable
              accessibilityLabel="발음 듣기"
              onPress={() => speakWord(currentCard.word, getCardAudioId(currentCard))}
              style={[styles.smallIconButton, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="volume-medium" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          {currentCard.phonetic && (
            <ThemedText style={[styles.phoneticText, { color: colors.textMuted }]}>{currentCard.phonetic}</ThemedText>
          )}
        </View>

        <OptionGrid
          answer={currentCard.definition}
          colors={colors}
          disabled={Boolean(selectedAnswer)}
          options={options}
          selectedAnswer={selectedAnswer}
          onSelect={handleAnswer}
        />

        {selectedAnswer && (
          <View style={[styles.feedbackRow, { borderColor: isCorrect ? colors.success : colors.warning }]}>
            <Ionicons
              name={isCorrect ? 'checkmark-circle' : 'repeat'}
              size={18}
              color={isCorrect ? colors.success : colors.warning}
            />
            <ThemedText style={[styles.feedbackText, { color: colors.textSecondary }]}>
              {isCorrect ? '정답' : currentCard.definition}
            </ThemedText>
            <ActionButton label="다음" icon="arrow-forward" colors={colors} onPress={handleNext} compact />
          </View>
        )}
      </View>
    </ModeScrollBody>
  );
}

function TestMode({ cards, colors, compact }: { cards: PracticeCard[]; colors: AppColors; compact: boolean }) {
  const [questions, setQuestions] = useState<TestQuestion[]>(() => buildTestQuestions(cards));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    setQuestions(buildTestQuestions(cards));
    setCurrentIndex(0);
    setAnswers({});
  }, [cards]);

  const currentQuestion = questions[currentIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isDone = currentIndex >= questions.length;
  const correctCount = questions.filter((question) => answers[question.id] === question.answer).length;
  const missedQuestions = questions.filter((question) => answers[question.id] && answers[question.id] !== question.answer);

  const handleRestart = () => {
    setQuestions(buildTestQuestions(cards));
    setCurrentIndex(0);
    setAnswers({});
  };

  if (isDone) {
    return (
      <ModeScrollBody compact={compact}>
        <View style={[styles.resultPanel, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <ThemedText style={styles.resultTitle}>테스트 결과</ThemedText>
          <View style={styles.scoreRow}>
            <ScorePill label="점수" value={`${correctCount}/${questions.length}`} color={colors.accent} />
            <ScorePill label="오답" value={missedQuestions.length} color={colors.error} />
          </View>

          {missedQuestions.length > 0 && (
            <View style={styles.missList}>
              {missedQuestions.slice(0, 8).map((question) => (
                <View key={question.id} style={[styles.missItem, { borderColor: colors.border }]}>
                  <ThemedText style={styles.missWord}>{question.card.word}</ThemedText>
                  <ThemedText style={[styles.missMeaning, { color: colors.textMuted }]}>{question.card.definition}</ThemedText>
                </View>
              ))}
            </View>
          )}

          <ActionButton label="새 테스트" icon="refresh" colors={colors} onPress={handleRestart} />
        </View>
      </ModeScrollBody>
    );
  }

  return (
    <ModeScrollBody compact={compact}>
      <View style={[styles.practicePanel, compact && styles.practicePanelCompact, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.panelHeader}>
          <ThemedText style={[styles.panelLabel, { color: colors.textMuted }]}>
            {currentQuestion.direction === 'word-to-meaning' ? '뜻 고르기' : '단어 고르기'}
          </ThemedText>
          <ThemedText style={[styles.panelCounter, { color: colors.textMuted }]}>
            {currentIndex + 1} / {questions.length}
          </ThemedText>
        </View>

        <ThemedText style={[styles.testPrompt, compact && styles.testPromptCompact]}>{currentQuestion.prompt}</ThemedText>

        <OptionGrid
          answer={currentQuestion.answer}
          colors={colors}
          disabled={false}
          options={currentQuestion.options}
          revealAnswer={false}
          selectedAnswer={selectedAnswer ?? null}
          onSelect={(answer) =>
            setAnswers((value) => ({
              ...value,
              [currentQuestion.id]: answer,
            }))
          }
        />

        <View style={styles.testFooter}>
          <ActionButton
            label={currentIndex === questions.length - 1 ? '채점' : '다음'}
            icon={currentIndex === questions.length - 1 ? 'checkmark' : 'arrow-forward'}
            colors={colors}
            disabled={!selectedAnswer}
            onPress={() => setCurrentIndex((value) => value + 1)}
          />
        </View>
      </View>
    </ModeScrollBody>
  );
}

function MatchMode({ cards, colors, compact }: { cards: PracticeCard[]; colors: AppColors; compact: boolean }) {
  const [tiles, setTiles] = useState<MatchTile[]>(() => shuffleItems(createMatchTiles(cards)));
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [matchedCardIds, setMatchedCardIds] = useState<Set<string>>(() => new Set());
  const [wrongTileIds, setWrongTileIds] = useState<string[]>([]);

  useEffect(() => {
    setTiles(shuffleItems(createMatchTiles(cards)));
    setSelectedTileId(null);
    setMatchedCardIds(new Set());
    setWrongTileIds([]);
  }, [cards]);

  const matchedCount = matchedCardIds.size;
  const isComplete = matchedCount > 0 && matchedCount * 2 === tiles.length;

  const handleNewBoard = () => {
    setTiles(shuffleItems(createMatchTiles(cards)));
    setSelectedTileId(null);
    setMatchedCardIds(new Set());
    setWrongTileIds([]);
  };

  const handleTilePress = (tile: MatchTile) => {
    if (matchedCardIds.has(tile.cardId) || wrongTileIds.length > 0) return;

    if (!selectedTileId) {
      setSelectedTileId(tile.tileId);
      return;
    }

    if (selectedTileId === tile.tileId) {
      setSelectedTileId(null);
      return;
    }

    const selectedTile = tiles.find((item) => item.tileId === selectedTileId);
    if (!selectedTile) return;

    const isMatch = selectedTile.cardId === tile.cardId && selectedTile.kind !== tile.kind;

    if (isMatch) {
      setMatchedCardIds((value) => new Set(value).add(tile.cardId));
      setSelectedTileId(null);
      return;
    }

    setWrongTileIds([selectedTile.tileId, tile.tileId]);
    setTimeout(() => {
      setWrongTileIds([]);
      setSelectedTileId(null);
    }, 550);
  };

  return (
    <ModeScrollBody compact={compact}>
      <View style={[styles.matchHeader, { borderColor: colors.border }]}>
        <View>
          <ThemedText style={styles.matchTitle}>매칭</ThemedText>
          <ThemedText style={[styles.panelCounter, { color: colors.textMuted }]}>
            {matchedCount} / {tiles.length / 2}
          </ThemedText>
        </View>
        <ActionButton label="새 판" icon="shuffle" colors={colors} onPress={handleNewBoard} compact />
      </View>

      <View style={styles.matchGrid}>
        {tiles.map((tile) => {
          const isSelected = selectedTileId === tile.tileId;
          const isMatched = matchedCardIds.has(tile.cardId);
          const isWrong = wrongTileIds.includes(tile.tileId);

          return (
            <Pressable
              key={tile.tileId}
              accessibilityRole="button"
              disabled={isMatched}
              onPress={() => handleTilePress(tile)}
              style={[
                styles.matchTile,
                compact && styles.matchTileCompact,
                {
                  backgroundColor: isMatched ? `${colors.success}33` : colors.surfaceElevated,
                  borderColor: isWrong
                    ? colors.error
                    : isSelected
                      ? colors.accent
                      : isMatched
                        ? colors.success
                        : colors.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.matchTileText,
                  { color: isMatched ? colors.textMuted : colors.textSecondary },
                ]}
              >
                {tile.text}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {isComplete && (
        <View style={[styles.completeStrip, { borderColor: colors.success }]}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <ThemedText style={[styles.feedbackText, { color: colors.textSecondary }]}>완료</ThemedText>
        </View>
      )}
    </ModeScrollBody>
  );
}

function OptionGrid({
  answer,
  colors,
  disabled,
  options,
  revealAnswer = true,
  selectedAnswer,
  onSelect,
}: {
  answer: string;
  colors: AppColors;
  disabled: boolean;
  options: string[];
  revealAnswer?: boolean;
  selectedAnswer: string | null;
  onSelect: (answer: string) => void;
}) {
  return (
    <View style={styles.optionGrid}>
      {options.map((option) => {
        const isSelected = selectedAnswer === option;
        const shouldReveal = revealAnswer && Boolean(selectedAnswer);
        const showCorrect = shouldReveal && option === answer;
        const showWrong = shouldReveal && isSelected && selectedAnswer !== answer;

        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => onSelect(option)}
            style={[
              styles.optionButton,
              {
                backgroundColor: showCorrect
                  ? `${colors.success}33`
                  : showWrong
                    ? `${colors.error}33`
                    : colors.surface,
                borderColor: showCorrect
                  ? colors.success
                  : showWrong
                    ? colors.error
                    : isSelected
                      ? colors.accent
                      : colors.border,
              },
            ]}
          >
            <ThemedText style={[styles.optionText, { color: colors.textSecondary }]}>{option}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function ActionButton({
  colors,
  disabled,
  icon,
  label,
  compact,
  onPress,
}: {
  colors: AppColors;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        compact && styles.actionButtonCompact,
        {
          backgroundColor: disabled ? colors.surface : colors.accent,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={16} color="#000000" />
      <ThemedText style={styles.actionButtonText}>{label}</ThemedText>
    </Pressable>
  );
}

function ScorePill({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <View style={[styles.scorePill, { borderColor: color }]}>
      <ThemedText style={[styles.scoreValue, { color }]}>{value}</ThemedText>
      <ThemedText style={styles.scoreLabel}>{label}</ThemedText>
    </View>
  );
}

function ModeScrollBody({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <ScrollView
      style={styles.modeBody}
      contentContainerStyle={[styles.modeContent, compact && styles.modeContentCompact]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
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
  topControls: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  topControlsMobile: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  flashcardShell: {
    flex: 1,
    minHeight: 0,
  },
  dayBadge: {
    alignSelf: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  dayBadgeText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  modeTabs: {
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    minHeight: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.xs,
  },
  modeTabCompact: {
    minHeight: 34,
    gap: 4,
    paddingHorizontal: 2,
  },
  modeTabText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
  },
  modeTabTextCompact: {
    fontSize: 12,
  },
  modeBody: {
    flex: 1,
  },
  modeContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  modeContentCompact: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  practicePanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  practicePanelCompact: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  resultPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.lg,
    alignItems: 'center',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  panelLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
  },
  panelCounter: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  promptBlock: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  wordLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  promptWord: {
    fontSize: 34,
    lineHeight: 42,
    fontFamily: FontFamily.bold,
    textAlign: 'center',
  },
  promptWordCompact: {
    fontSize: 29,
    lineHeight: 36,
  },
  phoneticText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
  },
  smallIconButton: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionGrid: {
    gap: Spacing.sm,
  },
  optionButton: {
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  optionText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FontFamily.medium,
  },
  feedbackRow: {
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  feedbackText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.medium,
  },
  actionButton: {
    minHeight: 44,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  actionButtonCompact: {
    minHeight: 36,
  },
  actionButtonText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
  },
  resultTitle: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bold,
  },
  scoreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  scorePill: {
    minWidth: 98,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  scoreValue: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bold,
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    opacity: 0.7,
  },
  testPrompt: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: FontFamily.bold,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  testPromptCompact: {
    fontSize: 23,
    lineHeight: 30,
    paddingVertical: Spacing.md,
  },
  testFooter: {
    alignItems: 'flex-end',
  },
  missList: {
    alignSelf: 'stretch',
    gap: Spacing.sm,
  },
  missItem: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  missWord: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
  },
  missMeaning: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  matchHeader: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  matchTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
  },
  matchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  matchTile: {
    width: '48.5%',
    minHeight: 78,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  matchTileCompact: {
    width: '48%',
    minHeight: 66,
    paddingHorizontal: Spacing.xs,
  },
  matchTileText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.medium,
    textAlign: 'center',
  },
  completeStrip: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
