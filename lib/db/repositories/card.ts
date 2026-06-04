/**
 * Card Repository
 * Handles all database operations for flashcards
 */
import { getDatabase, runInDatabaseTransaction } from '../index';
import type { DbCard, DbCardProgress, CreateCardInput } from '../types';
import { stringifySynonyms } from '../types';
import { createNewCardState } from '@/lib/srs';

/**
 * Get all cards for a deck
 */
export async function getCardsByDeckId(deckId: string): Promise<DbCard[]> {
  const db = await getDatabase();
  return db.getAllAsync<DbCard>(
    'SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at ASC',
    [deckId]
  );
}

/**
 * Get a single card by ID
 */
export async function getCardById(id: string): Promise<DbCard | null> {
  const db = await getDatabase();
  return db.getFirstAsync<DbCard>('SELECT * FROM cards WHERE id = ?', [id]);
}

/**
 * Create a new card with initial progress state
 */
export async function createCard(input: CreateCardInput): Promise<DbCard> {
  const db = await getDatabase();
  const id = input.id ?? generateId();
  const now = Date.now();
  const initialState = createNewCardState();

  await runInDatabaseTransaction(async (txn) => {
    await txn.runAsync(
      `INSERT INTO cards (id, deck_id, front_word, front_phonetic, back_definition, back_example, back_synonyms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.deckId,
        input.frontWord,
        input.frontPhonetic ?? null,
        input.backDefinition,
        input.backExample ?? null,
        stringifySynonyms(input.backSynonyms),
        now,
      ]
    );

    await txn.runAsync(
      `INSERT INTO card_progress (card_id, status, interval, ease, due_date, learning_step, lapse_count, review_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        initialState.status,
        initialState.interval,
        initialState.ease,
        initialState.dueDate,
        initialState.learningStep,
        initialState.lapseCount,
        initialState.reviewCount,
      ]
    );
  });

  return {
    id,
    deck_id: input.deckId,
    front_word: input.frontWord,
    front_phonetic: input.frontPhonetic ?? null,
    back_definition: input.backDefinition,
    back_example: input.backExample ?? null,
    back_synonyms: stringifySynonyms(input.backSynonyms),
    created_at: now,
  };
}

/**
 * Create multiple cards in a transaction
 */
export async function createCards(inputs: CreateCardInput[]): Promise<DbCard[]> {
  const db = await getDatabase();
  const cards: DbCard[] = [];
  const now = Date.now();

  await runInDatabaseTransaction(async (txn) => {
    for (const input of inputs) {
      const id = input.id ?? generateId();
      const initialState = createNewCardState();

      await txn.runAsync(
        `INSERT INTO cards (id, deck_id, front_word, front_phonetic, back_definition, back_example, back_synonyms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.deckId,
          input.frontWord,
          input.frontPhonetic ?? null,
          input.backDefinition,
          input.backExample ?? null,
          stringifySynonyms(input.backSynonyms),
          now,
        ]
      );

      await txn.runAsync(
        `INSERT INTO card_progress (card_id, status, interval, ease, due_date, learning_step, lapse_count, review_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          initialState.status,
          initialState.interval,
          initialState.ease,
          initialState.dueDate,
          initialState.learningStep,
          initialState.lapseCount,
          initialState.reviewCount,
        ]
      );

      cards.push({
        id,
        deck_id: input.deckId,
        front_word: input.frontWord,
        front_phonetic: input.frontPhonetic ?? null,
        back_definition: input.backDefinition,
        back_example: input.backExample ?? null,
        back_synonyms: stringifySynonyms(input.backSynonyms),
        created_at: now,
      });
    }
  });

  return cards;
}

/**
 * Update a card's content (not SRS state)
 */
export async function updateCard(
  id: string,
  updates: Partial<Omit<CreateCardInput, 'deckId'>>
): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (updates.frontWord !== undefined) {
    fields.push('front_word = ?');
    values.push(updates.frontWord);
  }
  if (updates.frontPhonetic !== undefined) {
    fields.push('front_phonetic = ?');
    values.push(updates.frontPhonetic ?? null);
  }
  if (updates.backDefinition !== undefined) {
    fields.push('back_definition = ?');
    values.push(updates.backDefinition);
  }
  if (updates.backExample !== undefined) {
    fields.push('back_example = ?');
    values.push(updates.backExample ?? null);
  }
  if (updates.backSynonyms !== undefined) {
    fields.push('back_synonyms = ?');
    values.push(stringifySynonyms(updates.backSynonyms));
  }

  if (fields.length === 0) return;

  values.push(id);
  await db.runAsync(
    `UPDATE cards SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Delete a card (cascades to progress and logs)
 */
export async function deleteCard(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM cards WHERE id = ?', [id]);
}

/**
 * Get card count by status for a deck
 */
export async function getCardCountByStatus(
  deckId: string
): Promise<{ new: number; learning: number; review: number; relearning: number }> {
  const db = await getDatabase();
  const results = await db.getAllAsync<{ status: string; count: number }>(
    `SELECT cp.status, COUNT(*) as count
     FROM cards c
     JOIN card_progress cp ON c.id = cp.card_id
     WHERE c.deck_id = ?
     GROUP BY cp.status`,
    [deckId]
  );

  const counts = { new: 0, learning: 0, review: 0, relearning: 0 };
  for (const row of results) {
    if (row.status in counts) {
      counts[row.status as keyof typeof counts] = row.count;
    }
  }
  return counts;
}

/**
 * Check if a card exists by ID
 */
async function cardExists(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM cards WHERE id = ?',
    [id]
  );
  return (result?.count ?? 0) > 0;
}

/**
 * Upsert a card (insert or update on conflict)
 * Preserves SRS progress - only updates card content
 * Creates new card_progress only for new cards
 */
export async function upsertCard(input: CreateCardInput): Promise<void> {
  const db = await getDatabase();
  const id = input.id ?? generateId();
  const now = Date.now();

  // Check if card already exists
  const exists = await cardExists(id);

  if (exists) {
    // Update only card content, preserve progress
    await db.runAsync(
      `UPDATE cards SET
         front_word = ?,
         front_phonetic = ?,
         back_definition = ?,
         back_example = ?,
         back_synonyms = ?
       WHERE id = ?`,
      [
        input.frontWord,
        input.frontPhonetic ?? null,
        input.backDefinition,
        input.backExample ?? null,
        stringifySynonyms(input.backSynonyms),
        id,
      ]
    );
  } else {
    // Create new card with initial progress
    const initialState = createNewCardState();

    await runInDatabaseTransaction(async (txn) => {
      await txn.runAsync(
        `INSERT INTO cards (id, deck_id, front_word, front_phonetic, back_definition, back_example, back_synonyms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.deckId,
          input.frontWord,
          input.frontPhonetic ?? null,
          input.backDefinition,
          input.backExample ?? null,
          stringifySynonyms(input.backSynonyms),
          now,
        ]
      );

      await txn.runAsync(
        `INSERT INTO card_progress (card_id, status, interval, ease, due_date, learning_step, lapse_count, review_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          initialState.status,
          initialState.interval,
          initialState.ease,
          initialState.dueDate,
          initialState.learningStep,
          initialState.lapseCount,
          initialState.reviewCount,
        ]
      );
    });
  }
}

/**
 * Upsert multiple cards in a transaction
 * Preserves SRS progress for existing cards
 */
export async function upsertCards(inputs: CreateCardInput[]): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();

  await runInDatabaseTransaction(async (txn) => {
    for (const input of inputs) {
      const id = input.id ?? generateId();

      const existsResult = await txn.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM cards WHERE id = ?',
        [id]
      );
      const exists = (existsResult?.count ?? 0) > 0;

      if (exists) {
        await txn.runAsync(
          `UPDATE cards SET
             front_word = ?,
             front_phonetic = ?,
             back_definition = ?,
             back_example = ?,
             back_synonyms = ?
           WHERE id = ?`,
          [
            input.frontWord,
            input.frontPhonetic ?? null,
            input.backDefinition,
            input.backExample ?? null,
            stringifySynonyms(input.backSynonyms),
            id,
          ]
        );
      } else {
        const initialState = createNewCardState();

        await txn.runAsync(
          `INSERT INTO cards (id, deck_id, front_word, front_phonetic, back_definition, back_example, back_synonyms, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            input.deckId,
            input.frontWord,
            input.frontPhonetic ?? null,
            input.backDefinition,
            input.backExample ?? null,
            stringifySynonyms(input.backSynonyms),
            now,
          ]
        );

        await txn.runAsync(
          `INSERT INTO card_progress (card_id, status, interval, ease, due_date, learning_step, lapse_count, review_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            initialState.status,
            initialState.interval,
            initialState.ease,
            initialState.dueDate,
            initialState.learningStep,
            initialState.lapseCount,
            initialState.reviewCount,
          ]
        );
      }
    }
  });
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
