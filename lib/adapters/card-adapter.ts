/**
 * Card Adapter
 * Transforms database card types to UI-compatible types
 */
import type { StudyCard } from '@/lib/db/services/study';
import type { FlashcardFrontProps } from '@/components/flashcard/FlashcardFront/FlashcardFront.type';
import type {
  FlashcardBackProps,
  CardStatsProps,
} from '@/components/flashcard/FlashcardBack/FlashcardBack.type';
import type { CardState, CardStatus, IntervalPreview } from '@/lib/srs';
import type { Rating as UIRating } from '@/components/study/RatingButtons/RatingButtons.type';
import type { Rating as SRSRating } from '@/lib/srs';
import { formatDays, DAY_MS } from '@/lib/srs';
import { speakWord } from '@/lib/audio/speech';

/**
 * Adapted card structure for UI consumption
 */
export interface AdaptedCard {
  id: string;
  deckId: string;
  front: FlashcardFrontProps;
  back: FlashcardBackProps;
  stats: CardStatsProps;
  state: CardState;
  createdAt: number;
}

/**
 * Transform a StudyCard from DB to UI-compatible AdaptedCard
 */
export function adaptCardToUI(card: StudyCard): AdaptedCard {
  const front: FlashcardFrontProps = {
    word: card.front.word,
    phonetic: card.front.phonetic ?? undefined,
    onAudioPress: () => speakWord(card.front.word, card.id),
  };

  const back: FlashcardBackProps = {
    definition: card.back.definition,
    examples: card.back.example ? [card.back.example] : undefined,
    synonyms: card.back.synonyms.length > 0 ? card.back.synonyms : undefined,
    highlightWord: card.front.word,
  };

  const stats = adaptStateToStats(card.state);

  return {
    id: card.id,
    deckId: card.deckId,
    front,
    back,
    stats,
    state: card.state,
    createdAt: card.createdAt,
  };
}

/**
 * Transform multiple StudyCards to AdaptedCards
 */
export function adaptCardsToUI(cards: StudyCard[]): AdaptedCard[] {
  return cards.map(adaptCardToUI);
}

/**
 * Transform CardState to CardStatsProps for UI display
 */
export function adaptStateToStats(state: CardState): CardStatsProps {
  return {
    reviews: state.reviewCount,
    interval: formatInterval(state.interval, state.status),
    ease: Math.round(state.ease * 100), // Convert 2.5 → 250
    type: mapStatusToType(state.status),
  };
}

/**
 * Map CardStatus to UI type
 * 'relearning' is shown as 'learning' in UI
 */
export function mapStatusToType(
  status: CardStatus
): 'new' | 'learning' | 'review' {
  switch (status) {
    case 'new':
      return 'new';
    case 'learning':
    case 'relearning':
      return 'learning';
    case 'review':
      return 'review';
    default:
      return 'new';
  }
}

/**
 * Format interval for display
 * For new/learning cards, shows "New" or learning step
 * For review cards, shows formatted days/months/years
 */
export function formatInterval(interval: number, status: CardStatus): string {
  if (status === 'new') {
    return '새 카드';
  }

  if (status === 'learning' || status === 'relearning') {
    if (interval === 0) {
      return '학습 중';
    }
    // Learning cards have interval in ms, convert to readable format
    const minutes = interval / (60 * 1000);
    if (minutes < 60) {
      return `${Math.round(minutes)}분`;
    }
    const hours = minutes / 60;
    return `${hours.toFixed(1)}시간`;
  }

  // Review cards have interval in days
  return formatDays(interval / DAY_MS);
}

/**
 * Map UI Rating to SRS Rating
 * UI uses string ratings, SRS uses numeric
 */
export function mapUIRatingToSRS(uiRating: UIRating): SRSRating {
  const mapping: Record<UIRating, SRSRating> = {
    again: 1,
    hard: 2,
    good: 3,
    easy: 4,
  };
  return mapping[uiRating];
}

/**
 * Map SRS Rating to UI Rating
 */
export function mapSRSRatingToUI(srsRating: SRSRating): UIRating {
  const mapping: Record<SRSRating, UIRating> = {
    1: 'again',
    2: 'hard',
    3: 'good',
    4: 'easy',
  };
  return mapping[srsRating];
}

/**
 * Transform IntervalPreview to UI format
 * Used for showing next review times on rating buttons
 */
export function adaptIntervalPreviewToUI(
  preview: IntervalPreview
): Record<UIRating, string> {
  return {
    again: preview.again,
    hard: preview.hard,
    good: preview.good,
    easy: preview.easy,
  };
}
