/**
 * Study Service
 * Manages study sessions and card review workflow
 */
import { getDatabase } from '../index';
import type { DbCard, DbCardProgress, DbCardWithProgress } from '../types';
import { dbProgressToCardState, parseSynonyms } from '../types';
import {
  getDueCards,
  updateCardProgress,
  getCardProgress,
  undoLastReview,
  getLastReviewLog,
} from '../repositories/progress';
import { getDailyNewCardLimit } from '../repositories/settings';
import { calculateSRS, DEFAULT_SRS_CONFIG } from '@/lib/srs';
import type { CardState, Rating, SRSResult } from '@/lib/srs';

// ============================================
// Types
// ============================================

/**
 * Study card with all necessary data for UI
 */
export interface StudyCard {
  id: string;
  deckId: string;
  front: {
    word: string;
    phonetic: string | null;
  };
  back: {
    definition: string;
    example: string | null;
    synonyms: string[];
  };
  state: CardState;
  createdAt: number;
}

/**
 * Study queue state
 */
export interface StudyQueue {
  cards: StudyCard[];
  currentIndex: number;
  totalCards: number;
  completedCount: number;
  canUndo: boolean;
  lastReviewedCardId: string | null;
}

/**
 * Session summary after completion
 */
export interface SessionSummary {
  totalReviewed: number;
  newCardsLearned: number;
  reviewCards: number;
  learningCards: number;
  averageTimeMs: number;
}

// ============================================
// Study Queue Management
// ============================================

/**
 * Get study queue for a deck
 */
export async function getStudyQueue(deckId: string, studyDay?: number): Promise<StudyQueue> {
  const dailyLimit = await getDailyNewCardLimit();
  const dueCards = await getDueCards(deckId, dailyLimit, studyDay);

  const db = await getDatabase();

  // Fetch full card data for due cards
  const cardIds = dueCards.map((p) => p.card_id);
  if (cardIds.length === 0) {
    return {
      cards: [],
      currentIndex: 0,
      totalCards: 0,
      completedCount: 0,
      canUndo: false,
      lastReviewedCardId: null,
    };
  }

  // Get card details
  const placeholders = cardIds.map(() => '?').join(',');
  const dbCards = await db.getAllAsync<DbCard>(
    `SELECT * FROM cards WHERE id IN (${placeholders})`,
    cardIds
  );

  // Create card map for O(1) lookup
  const cardMap = new Map<string, DbCard>();
  for (const card of dbCards) {
    cardMap.set(card.id, card);
  }

  // Build study cards in priority order
  const studyCards: StudyCard[] = [];
  for (const progress of dueCards) {
    const card = cardMap.get(progress.card_id);
    if (!card) continue;

    studyCards.push({
      id: card.id,
      deckId: card.deck_id,
      front: {
        word: card.front_word,
        phonetic: card.front_phonetic,
      },
      back: {
        definition: card.back_definition,
        example: card.back_example,
        synonyms: parseSynonyms(card.back_synonyms),
      },
      state: dbProgressToCardState(progress),
      createdAt: card.created_at,
    });
  }

  return {
    cards: studyCards,
    currentIndex: 0,
    totalCards: studyCards.length,
    completedCount: 0,
    canUndo: false,
    lastReviewedCardId: null,
  };
}

/**
 * Submit a rating for the current card
 */
export async function submitRating(
  cardId: string,
  rating: Rating,
  timeTakenMs?: number
): Promise<SRSResult> {
  // Get current state
  const progress = await getCardProgress(cardId);
  if (!progress) {
    throw new Error(`Card progress not found: ${cardId}`);
  }

  const currentState = dbProgressToCardState(progress);

  // Calculate new state
  const result = calculateSRS(rating, currentState, DEFAULT_SRS_CONFIG);

  // Update database
  await updateCardProgress(
    cardId,
    result.newState,
    rating,
    currentState,
    timeTakenMs
  );

  return result;
}

/**
 * Undo the last rating (only for the most recent card)
 * @returns The restored CardState, or null if undo was not possible
 */
export async function undoRating(cardId: string): Promise<CardState | null> {
  return undoLastReview(cardId);
}

/**
 * Check if undo is available for a card
 */
export async function canUndoRating(cardId: string): Promise<boolean> {
  const lastLog = await getLastReviewLog(cardId);
  return lastLog !== null && lastLog.prev_state !== null;
}

// ============================================
// Session Statistics
// ============================================

/**
 * Get today's session summary for a deck
 */
export async function getTodaySessionSummary(deckId: string): Promise<SessionSummary> {
  const db = await getDatabase();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  // Get all reviews today
  const reviews = await db.getAllAsync<{
    card_id: string;
    rating: number;
    time_taken_ms: number | null;
    prev_status: string;
  }>(
    `SELECT
      rl.card_id,
      rl.rating,
      rl.time_taken_ms,
      json_extract(rl.prev_state, '$.status') as prev_status
     FROM review_logs rl
     JOIN cards c ON rl.card_id = c.id
     WHERE c.deck_id = ?
       AND rl.reviewed_at >= ?
     ORDER BY rl.reviewed_at ASC`,
    [deckId, todayStartMs]
  );

  // Count unique cards and categorize
  const uniqueCards = new Set<string>();
  let newCardsLearned = 0;
  let reviewCards = 0;
  let learningCards = 0;
  let totalTimeMs = 0;
  let timedReviews = 0;

  for (const review of reviews) {
    if (!uniqueCards.has(review.card_id)) {
      uniqueCards.add(review.card_id);

      if (review.prev_status === 'new') {
        newCardsLearned++;
      } else if (review.prev_status === 'review') {
        reviewCards++;
      } else {
        learningCards++;
      }
    }

    if (review.time_taken_ms) {
      totalTimeMs += review.time_taken_ms;
      timedReviews++;
    }
  }

  return {
    totalReviewed: uniqueCards.size,
    newCardsLearned,
    reviewCards,
    learningCards,
    averageTimeMs: timedReviews > 0 ? Math.round(totalTimeMs / timedReviews) : 0,
  };
}

/**
 * Check if deck has any cards to study today
 */
export async function hasDueCards(deckId: string): Promise<boolean> {
  const dailyLimit = await getDailyNewCardLimit();
  const dueCards = await getDueCards(deckId, dailyLimit);
  return dueCards.length > 0;
}
