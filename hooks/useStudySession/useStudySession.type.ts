import type { CardState } from '@/lib/srs';
import type { AdaptedCard } from '@/lib/adapters';
import type { Rating as UIRating } from '@/components/study/RatingButtons/RatingButtons.type';

export interface RatingCounts {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface SessionStats {
  totalReviewed: number;
  newCardsLearned: number;
  learningCards: number;
  reviewCards: number;
  ratingCounts: RatingCounts;
}

export interface StudySessionState {
  cards: AdaptedCard[];
  currentIndex: number;
  isLoading: boolean;
  error: Error | null;
  canUndo: boolean;
  lastReviewedCardId: string | null;
  lastRating: UIRating | null;
  sessionStats: SessionStats;
  intervalPreviews: Record<UIRating, string> | null;
}

export type StudySessionAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; cards: AdaptedCard[] }
  | { type: 'LOAD_ERROR'; error: Error }
  | {
      type: 'RATE_CARD';
      cardId: string;
      wasNew: boolean;
      wasLearning: boolean;
      wasReview: boolean;
      newState: CardState;
      rating: UIRating;
    }
  | { type: 'UNDO_SUCCESS'; cardId: string; restoredState: CardState }
  | { type: 'SET_PREVIEWS'; previews: Record<UIRating, string> | null }
  | { type: 'GO_TO_PREVIOUS_CARD' }
  | { type: 'GO_TO_NEXT_CARD' };

export interface UseStudySessionOptions {
  deckId: string;
  studyDay?: number;
}

export interface UseStudySessionReturn {
  isLoading: boolean;
  error: Error | null;
  currentCard: AdaptedCard | null;
  currentIndex: number;
  totalCards: number;
  isComplete: boolean;
  canUndo: boolean;
  intervalPreviews: Record<UIRating, string> | null;
  sessionStats: SessionStats;
  submitRating: (rating: UIRating) => Promise<void>;
  undoRating: () => Promise<void>;
  goToPreviousCard: () => void;
  goToNextCard: () => void;
  refresh: () => Promise<void>;
}
