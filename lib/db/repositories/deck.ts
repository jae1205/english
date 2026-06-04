/**
 * Deck Repository
 * Handles all database operations for decks (read-only for MVP)
 */
import { getDatabase, runInDatabaseTransaction } from '../index';
import type { DbDeck, CreateDeckInput } from '../types';

/**
 * Get all decks
 */
export async function getAllDecks(): Promise<DbDeck[]> {
  const db = await getDatabase();
  return db.getAllAsync<DbDeck>('SELECT * FROM decks ORDER BY title ASC');
}

/**
 * Get a single deck by ID
 */
export async function getDeckById(id: string): Promise<DbDeck | null> {
  const db = await getDatabase();
  return db.getFirstAsync<DbDeck>('SELECT * FROM decks WHERE id = ?', [id]);
}

/**
 * Create a new deck
 */
export async function createDeck(input: CreateDeckInput): Promise<DbDeck> {
  const db = await getDatabase();
  const id = input.id ?? generateId();
  const now = Date.now();

  await db.runAsync(
    'INSERT INTO decks (id, title, description, created_at) VALUES (?, ?, ?, ?)',
    [id, input.title, input.description ?? null, now]
  );

  return {
    id,
    title: input.title,
    description: input.description ?? null,
    created_at: now,
  };
}

/**
 * Create multiple decks in a transaction
 */
export async function createDecks(inputs: CreateDeckInput[]): Promise<DbDeck[]> {
  const db = await getDatabase();
  const decks: DbDeck[] = [];
  const now = Date.now();

  await runInDatabaseTransaction(async (txn) => {
    for (const input of inputs) {
      const id = input.id ?? generateId();
      await txn.runAsync(
        'INSERT INTO decks (id, title, description, created_at) VALUES (?, ?, ?, ?)',
        [id, input.title, input.description ?? null, now]
      );
      decks.push({
        id,
        title: input.title,
        description: input.description ?? null,
        created_at: now,
      });
    }
  });

  return decks;
}

/**
 * Check if a deck exists
 */
export async function deckExists(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM decks WHERE id = ?',
    [id]
  );
  return (result?.count ?? 0) > 0;
}

/**
 * Get total card count for a deck
 */
export async function getDeckCardCount(deckId: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM cards WHERE deck_id = ?',
    [deckId]
  );
  return result?.count ?? 0;
}

const UPSERT_DECK_SQL = `
  INSERT INTO decks (id, title, description, created_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    description = excluded.description`;

/**
 * Upsert a deck (insert or update on conflict)
 */
export async function upsertDeck(input: CreateDeckInput): Promise<void> {
  const db = await getDatabase();
  const id = input.id ?? generateId();

  await db.runAsync(UPSERT_DECK_SQL, [
    id,
    input.title,
    input.description ?? null,
    Date.now(),
  ]);
}

/**
 * Upsert multiple decks in a transaction
 */
export async function upsertDecks(inputs: CreateDeckInput[]): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();

  await runInDatabaseTransaction(async (txn) => {
    for (const input of inputs) {
      const id = input.id ?? generateId();
      await txn.runAsync(UPSERT_DECK_SQL, [
        id,
        input.title,
        input.description ?? null,
        now,
      ]);
    }
  });
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
