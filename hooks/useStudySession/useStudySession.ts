/**
 * useStudySession Hook
 * Manages study session state including card queue, ratings, and undo functionality
 */
import { useEffect, useCallback, useRef, useReducer } from 'react';
import {
  getStudyQueue,
  submitRating as dbSubmitRating,
  undoRating as dbUndoRating,
} from '@/lib/db';
import { getIntervalPreviews } from '@/lib/srs';
import {
  adaptCardToUI,
  mapUIRatingToSRS,
  adaptIntervalPreviewToUI,
  adaptStateToStats,
} from '@/lib/adapters';
import type { Rating as UIRating } from '@/components/study/RatingButtons/RatingButtons.type';

import type {
  StudySessionState,
  StudySessionAction,
  UseStudySessionReturn,
} from './useStudySession.type';

// ============================================
// Initial State
// ============================================

const initialState: StudySessionState = {
  cards: [],
  currentIndex: 0,
  isLoading: true,
  error: null,
  canUndo: false,
  lastReviewedCardId: null,
  lastRating: null,
  sessionStats: {
    totalReviewed: 0,
    newCardsLearned: 0,
    learningCards: 0,
    reviewCards: 0,
    ratingCounts: {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    },
  },
  intervalPreviews: null,
};

// ============================================
// Reducer
// ============================================

function reducer(
  state: StudySessionState,
  action: StudySessionAction
): StudySessionState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, isLoading: true, error: null };

    case 'LOAD_SUCCESS':
      return {
        ...state,
        cards: action.cards,
        currentIndex: 0,
        isLoading: false,
        error: null,
        canUndo: false,
        lastReviewedCardId: null,
        lastRating: null,
        sessionStats: {
          totalReviewed: 0,
          newCardsLearned: 0,
          learningCards: 0,
          reviewCards: 0,
          ratingCounts: {
            again: 0,
            hard: 0,
            good: 0,
            easy: 0,
          },
        },
      };

    case 'LOAD_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.error,
      };

    case 'RATE_CARD': {
      const updatedCards = state.cards.map((card) =>
        card.id === action.cardId
          ? {
              ...card,
              state: action.newState,
              stats: adaptStateToStats(action.newState),
            }
          : card
      );

      return {
        ...state,
        cards: updatedCards,
        currentIndex: state.currentIndex + 1,
        canUndo: true,
        lastReviewedCardId: action.cardId,
        lastRating: action.rating,
        sessionStats: {
          totalReviewed: state.sessionStats.totalReviewed + 1,
          newCardsLearned:
            state.sessionStats.newCardsLearned + (action.wasNew ? 1 : 0),
          learningCards:
            state.sessionStats.learningCards + (action.wasLearning ? 1 : 0),
          reviewCards:
            state.sessionStats.reviewCards + (action.wasReview ? 1 : 0),
          ratingCounts: {
            ...state.sessionStats.ratingCounts,
            [action.rating]: state.sessionStats.ratingCounts[action.rating] + 1,
          },
        },
        intervalPreviews: null,
      };
    }

    case 'UNDO_SUCCESS': {
      const updatedCards = state.cards.map((card) =>
        card.id === action.cardId
          ? {
              ...card,
              state: action.restoredState,
              stats: adaptStateToStats(action.restoredState),
            }
          : card
      );

      // Decrement the rating count for the last rating
      const updatedRatingCounts = state.lastRating
        ? {
            ...state.sessionStats.ratingCounts,
            [state.lastRating]: Math.max(
              0,
              state.sessionStats.ratingCounts[state.lastRating] - 1
            ),
          }
        : state.sessionStats.ratingCounts;

      // Determine card category from restored state for accurate stat rollback
      const wasNew = action.restoredState.status === 'new';
      const wasLearning =
        action.restoredState.status === 'learning' ||
        action.restoredState.status === 'relearning';
      const wasReview = action.restoredState.status === 'review';

      return {
        ...state,
        cards: updatedCards,
        currentIndex: Math.max(0, state.currentIndex - 1),
        canUndo: false,
        lastReviewedCardId: null,
        lastRating: null,
        sessionStats: {
          totalReviewed: Math.max(0, state.sessionStats.totalReviewed - 1),
          newCardsLearned: wasNew
            ? Math.max(0, state.sessionStats.newCardsLearned - 1)
            : state.sessionStats.newCardsLearned,
          learningCards: wasLearning
            ? Math.max(0, state.sessionStats.learningCards - 1)
            : state.sessionStats.learningCards,
          reviewCards: wasReview
            ? Math.max(0, state.sessionStats.reviewCards - 1)
            : state.sessionStats.reviewCards,
          ratingCounts: updatedRatingCounts,
        },
      };
    }

    case 'SET_PREVIEWS':
      return {
        ...state,
        intervalPreviews: action.previews,
      };

    default:
      return state;
  }
}

// ============================================
// Hook
// ============================================

/**
 * Hook to manage study session state
 *
 * @param deckId - The deck to study
 *
 * @example
 * ```tsx
 * function StudyScreen() {
 *   const { deckId } = useLocalSearchParams<{ deckId: string }>();
 *   const {
 *     currentCard,
 *     currentIndex,
 *     totalCards,
 *     isComplete,
 *     intervalPreviews,
 *     submitRating,
 *     undoRating,
 *   } = useStudySession(deckId!);
 *
 *   if (isComplete) {
 *     return <SummaryScreen stats={sessionStats} />;
 *   }
 *
 *   return (
 *     <Flashcard card={currentCard} />
 *     <RatingButtons onRate={submitRating} intervals={intervalPreviews} />
 *   );
 * }
 * ```
 */
export function useStudySession(deckId: string, studyDay?: number): UseStudySessionReturn {
  if (!deckId) {
    console.warn('[useStudySession] deckId is empty');
  }

  const [state, dispatch] = useReducer(reducer, initialState);

  // Use ref to track latest state for callbacks (stale closure prevention)
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Derived values
  const currentCard =
    state.currentIndex < state.cards.length
      ? state.cards[state.currentIndex]
      : null;
  const isComplete =
    !state.isLoading && state.currentIndex >= state.cards.length;

  // Load study queue
  const loadQueue = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });

    try {
      const queue = await getStudyQueue(deckId, studyDay);
      const adaptedCards = queue.cards.map(adaptCardToUI);
      dispatch({ type: 'LOAD_SUCCESS', cards: adaptedCards });
    } catch (error) {
      console.error('[useStudySession] Failed to load queue:', error);
      dispatch({
        type: 'LOAD_ERROR',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [deckId, studyDay]);

  // Update interval previews when current card changes
  useEffect(() => {
    if (currentCard) {
      const previews = getIntervalPreviews(currentCard.state);
      dispatch({
        type: 'SET_PREVIEWS',
        previews: adaptIntervalPreviewToUI(previews),
      });
    }
  }, [currentCard?.id]);

  // Submit rating
  const submitRating = useCallback(async (rating: UIRating) => {
    const card = stateRef.current.cards[stateRef.current.currentIndex];
    if (!card) return;

    const srsRating = mapUIRatingToSRS(rating);
    const wasNew = card.state.status === 'new';
    const wasLearning =
      card.state.status === 'learning' || card.state.status === 'relearning';
    const wasReview = card.state.status === 'review';

    try {
      const result = await dbSubmitRating(card.id, srsRating);
      if (!result?.newState) {
        console.error('[useStudySession] Invalid result from submitRating');
        return;
      }
      dispatch({
        type: 'RATE_CARD',
        cardId: card.id,
        wasNew,
        wasLearning,
        wasReview,
        newState: result.newState,
        rating,
      });
    } catch (error) {
      console.error('[useStudySession] Failed to submit rating:', error);
      // Don't throw - allow UI to remain interactive
    }
  }, []);

  // Undo rating
  const undoRating = useCallback(async () => {
    const { canUndo, lastReviewedCardId } = stateRef.current;
    if (!canUndo || !lastReviewedCardId) return;

    try {
      const restoredState = await dbUndoRating(lastReviewedCardId);
      if (restoredState) {
        dispatch({
          type: 'UNDO_SUCCESS',
          cardId: lastReviewedCardId,
          restoredState,
        });
      }
    } catch (error) {
      console.error('[useStudySession] Failed to undo:', error);
    }
  }, []);

  // Initial load - reuse loadQueue callback
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  return {
    isLoading: state.isLoading,
    error: state.error,
    currentCard,
    currentIndex: state.currentIndex,
    totalCards: state.cards.length,
    isComplete,
    canUndo: state.canUndo,
    intervalPreviews: state.intervalPreviews,
    sessionStats: state.sessionStats,
    submitRating,
    undoRating,
    refresh: loadQueue,
  };
}
