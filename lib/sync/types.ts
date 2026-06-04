/**
 * Sync Types
 * Type definitions for Google Sheets sync functionality
 */

/**
 * Result of a sync operation
 */
export interface SyncResult {
  /** Whether the sync completed successfully */
  success: boolean;
  /** Number of decks added or updated */
  decksAdded: number;
  /** Number of cards added or updated */
  cardsAdded: number;
  /** Error message if sync failed */
  error?: string;
}

/**
 * Raw deck row from CSV (matches spreadsheet columns)
 * Column names: id, title, description
 */
export interface RawDeckRow {
  [key: string]: string;
  id: string;
  title: string;
  description: string;
}

/**
 * Raw card row from CSV (matches spreadsheet columns)
 * Column names use snake_case to match Google Sheets
 */
export interface RawCardRow {
  [key: string]: string;
  id: string;
  deck_id: string;
  front_word: string;
  front_phonetic: string;
  back_definition: string;
  back_example: string;
  /** Comma-separated list of synonyms */
  back_synonyms: string;
}
