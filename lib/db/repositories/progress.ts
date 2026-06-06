/**
 * Progress Repository
 * Handles SRS state management for cards
 */
import { getDatabase, runInDatabaseTransaction } from '../index';
import type { DbCardProgress, DbReviewLog, DeckStats } from '../types';
import { dbProgressToCardState } from '../types';
import type { CardState, Rating } from '@/lib/srs';

export interface ProgressSnapshot {
  version: 1;
  updatedAt: number;
  cardProgress: DbCardProgress[];
  reviewLogs: DbReviewLog[];
}

/**
 * Get progress for a single card
 */
export async function getCardProgress(cardId: string): Promise<DbCardProgress | null> {
  const db = await getDatabase();
  return db.getFirstAsync<DbCardProgress>(
    'SELECT * FROM card_progress WHERE card_id = ?',
    [cardId]
  );
}

/**
 * Get CardState for a card (converted from DB format)
 */
export async function getCardState(cardId: string): Promise<CardState | null> {
  const progress = await getCardProgress(cardId);
  if (!progress) return null;
  return dbProgressToCardState(progress);
}

/**
 * Export all user-owned study progress for server sync.
 */
export async function exportProgressSnapshot(): Promise<ProgressSnapshot> {
  const db = await getDatabase();
  const cardProgress = await db.getAllAsync<DbCardProgress>(
    'SELECT * FROM card_progress ORDER BY card_id ASC'
  );
  const reviewLogs = await db.getAllAsync<DbReviewLog>(
    'SELECT * FROM review_logs ORDER BY id ASC'
  );

  return {
    version: 1,
    updatedAt: Date.now(),
    cardProgress,
    reviewLogs,
  };
}

/**
 * Replace local progress with a server snapshot.
 * Cards/decks are seeded from bundled vocabulary; only progress/logs are synced.
 */
export async function importProgressSnapshot(snapshot: ProgressSnapshot): Promise<void> {
  if (snapshot.version !== 1 || !Array.isArray(snapshot.cardProgress)) {
    throw new Error('Unsupported progress snapshot');
  }

  await runInDatabaseTransaction(async (txn) => {
    for (const progress of snapshot.cardProgress) {
      await txn.runAsync(
        `INSERT INTO card_progress (
          card_id,
          status,
          interval,
          ease,
          due_date,
          learning_step,
          lapse_count,
          review_count,
          last_reviewed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(card_id) DO UPDATE SET
          status = excluded.status,
          interval = excluded.interval,
          ease = excluded.ease,
          due_date = excluded.due_date,
          learning_step = excluded.learning_step,
          lapse_count = excluded.lapse_count,
          review_count = excluded.review_count,
          last_reviewed_at = excluded.last_reviewed_at`,
        [
          progress.card_id,
          progress.status,
          progress.interval,
          progress.ease,
          progress.due_date,
          progress.learning_step,
          progress.lapse_count,
          progress.review_count,
          progress.last_reviewed_at,
        ]
      );
    }

    await txn.runAsync('DELETE FROM review_logs');

    for (const log of snapshot.reviewLogs ?? []) {
      await txn.runAsync(
        `INSERT INTO review_logs (
          id,
          card_id,
          rating,
          reviewed_at,
          time_taken_ms,
          prev_state
        )
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          log.id,
          log.card_id,
          log.rating,
          log.reviewed_at,
          log.time_taken_ms,
          log.prev_state,
        ]
      );
    }
  });
}

/**
 * Update card progress after review
 */
export async function updateCardProgress(
  cardId: string,
  newState: CardState,
  rating: Rating,
  prevState: CardState,
  timeTakenMs?: number
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();

  await runInDatabaseTransaction(async (txn) => {
    // Update progress
    await txn.runAsync(
      `UPDATE card_progress SET
        status = ?,
        interval = ?,
        ease = ?,
        due_date = ?,
        learning_step = ?,
        lapse_count = ?,
        review_count = ?,
        last_reviewed_at = ?
       WHERE card_id = ?`,
      [
        newState.status,
        newState.interval,
        newState.ease,
        newState.dueDate,
        newState.learningStep,
        newState.lapseCount,
        newState.reviewCount,
        now,
        cardId,
      ]
    );

    // Log the review (for undo and statistics)
    await txn.runAsync(
      `INSERT INTO review_logs (card_id, rating, reviewed_at, time_taken_ms, prev_state)
       VALUES (?, ?, ?, ?, ?)`,
      [cardId, rating, now, timeTakenMs ?? null, JSON.stringify(prevState)]
    );
  });
}

/**
 * Get cards due for study in a deck
 * Returns cards in priority order: learning/relearning > review > new
 */
export async function getDueCards(
  deckId: string,
  dailyNewLimit: number,
  studyDay?: number,
  now: number = Date.now()
): Promise<DbCardProgress[]> {
  const db = await getDatabase();
  const dayFilterSql = studyDay ? 'AND c.back_example LIKE ?' : '';
  const dayFilterParams = studyDay ? [`Day ${studyDay} #%`] : [];

  // Get today's start (midnight)
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  // Count new cards studied today
  const newStudiedToday = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT rl.card_id) as count
     FROM review_logs rl
     JOIN card_progress cp ON rl.card_id = cp.card_id
     JOIN cards c ON cp.card_id = c.id
     WHERE c.deck_id = ?
       AND rl.reviewed_at >= ?
       AND cp.status != 'new'
       ${dayFilterSql}`,
    [deckId, todayStartMs, ...dayFilterParams]
  );

  const newCardsRemaining = Math.max(0, dailyNewLimit - (newStudiedToday?.count ?? 0));

  // Get due cards with priority ordering
  const dueCards = await db.getAllAsync<DbCardProgress>(
    `SELECT cp.*
     FROM card_progress cp
     JOIN cards c ON cp.card_id = c.id
     WHERE c.deck_id = ?
       ${dayFilterSql}
       AND (
         (cp.status IN ('learning', 'relearning') AND cp.due_date <= ?)
         OR (cp.status = 'review' AND cp.due_date <= ?)
         OR (cp.status = 'new')
       )
     ORDER BY
       CASE cp.status
         WHEN 'learning' THEN 1
         WHEN 'relearning' THEN 2
         WHEN 'review' THEN 3
         WHEN 'new' THEN 4
       END,
       cp.due_date ASC,
       c.created_at ASC`,
    [deckId, ...dayFilterParams, now, now]
  );

  // Filter new cards based on daily limit
  let newCardCount = 0;
  return dueCards.filter((card) => {
    if (card.status === 'new') {
      if (newCardCount >= newCardsRemaining) return false;
      newCardCount++;
    }
    return true;
  });
}

/**
 * Get deck statistics for dashboard
 */
export async function getDeckStats(
  deckId: string,
  dailyNewLimit: number,
  now: number = Date.now()
): Promise<DeckStats> {
  const db = await getDatabase();

  // Today's start for new card calculation
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  // Get counts by status
  const statusCounts = await db.getAllAsync<{ status: string; count: number }>(
    `SELECT cp.status, COUNT(*) as count
     FROM card_progress cp
     JOIN cards c ON cp.card_id = c.id
     WHERE c.deck_id = ?
     GROUP BY cp.status`,
    [deckId]
  );

  const counts: Record<string, number> = {};
  for (const row of statusCounts) {
    counts[row.status] = row.count;
  }

  // Get learning/relearning cards due now
  const learningDue = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM card_progress cp
     JOIN cards c ON cp.card_id = c.id
     WHERE c.deck_id = ?
       AND cp.status IN ('learning', 'relearning')
       AND cp.due_date <= ?`,
    [deckId, now]
  );

  // Mature threshold: 21 days in ms
  const matureThreshold = 21 * 24 * 60 * 60 * 1000;

  // Get mature review cards due now (interval >= 21 days)
  const reviewDue = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM card_progress cp
     JOIN cards c ON cp.card_id = c.id
     WHERE c.deck_id = ?
       AND cp.status = 'review'
       AND cp.interval >= ?
       AND cp.due_date <= ?`,
    [deckId, matureThreshold, now]
  );

  // Get young review cards due now (interval < 21 days)
  const youngDue = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM card_progress cp
     JOIN cards c ON cp.card_id = c.id
     WHERE c.deck_id = ?
       AND cp.status = 'review'
       AND cp.interval < ?
       AND cp.due_date <= ?`,
    [deckId, matureThreshold, now]
  );

  // Get new cards studied today
  const newStudiedToday = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT rl.card_id) as count
     FROM review_logs rl
     JOIN cards c ON rl.card_id = c.id
     WHERE c.deck_id = ?
       AND rl.reviewed_at >= ?`,
    [deckId, todayStartMs]
  );

  // Calculate available new cards
  const totalNew = counts['new'] ?? 0;
  const studiedToday = newStudiedToday?.count ?? 0;
  const availableNew = Math.min(totalNew, Math.max(0, dailyNewLimit - studiedToday));

  // Get mature card count (total, interval >= 21 days)
  const matureCards = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM card_progress cp
     JOIN cards c ON cp.card_id = c.id
     WHERE c.deck_id = ?
       AND cp.status = 'review'
       AND cp.interval >= ?`,
    [deckId, matureThreshold]
  );

  // Get young card count (review status with interval < 21 days)
  const youngCards = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM card_progress cp
     JOIN cards c ON cp.card_id = c.id
     WHERE c.deck_id = ?
       AND cp.status = 'review'
       AND cp.interval < ?`,
    [deckId, matureThreshold]
  );

  // Total cards
  const totalCards = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM cards WHERE deck_id = ?',
    [deckId]
  );

  // Get next due date for any card type (future only)
  const nextDue = await db.getFirstAsync<{ due_date: number }>(
    `SELECT MIN(cp.due_date) as due_date
     FROM card_progress cp
     JOIN cards c ON cp.card_id = c.id
     WHERE c.deck_id = ?
       AND cp.status IN ('learning', 'relearning', 'review')
       AND cp.due_date > ?`,
    [deckId, now]
  );

  return {
    deckId,
    newCount: availableNew,
    learningCount: learningDue?.count ?? 0,
    reviewCount: reviewDue?.count ?? 0,
    youngDueCount: youngDue?.count ?? 0,
    totalCards: totalCards?.count ?? 0,
    youngCards: youngCards?.count ?? 0,
    matureCards: matureCards?.count ?? 0,
    nextDueDate: nextDue?.due_date ?? null,
  };
}

/**
 * Get the last review log for undo functionality
 */
export async function getLastReviewLog(cardId: string): Promise<DbReviewLog | null> {
  const db = await getDatabase();
  return db.getFirstAsync<DbReviewLog>(
    'SELECT * FROM review_logs WHERE card_id = ? ORDER BY id DESC LIMIT 1',
    [cardId]
  );
}

/**
 * Undo the last review for a card
 * @returns The restored CardState, or null if undo was not possible
 */
export async function undoLastReview(cardId: string): Promise<CardState | null> {
  const db = await getDatabase();

  const lastLog = await getLastReviewLog(cardId);
  if (!lastLog || !lastLog.prev_state) return null;

  const prevState: CardState = JSON.parse(lastLog.prev_state);

  await runInDatabaseTransaction(async (txn) => {
    // Restore previous state
    await txn.runAsync(
      `UPDATE card_progress SET
        status = ?,
        interval = ?,
        ease = ?,
        due_date = ?,
        learning_step = ?,
        lapse_count = ?,
        review_count = ?
       WHERE card_id = ?`,
      [
        prevState.status,
        prevState.interval,
        prevState.ease,
        prevState.dueDate,
        prevState.learningStep,
        prevState.lapseCount,
        prevState.reviewCount,
        cardId,
      ]
    );

    // Delete the review log
    await txn.runAsync('DELETE FROM review_logs WHERE id = ?', [lastLog.id]);
  });

  return prevState;
}
