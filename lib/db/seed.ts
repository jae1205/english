/**
 * Database Seed Data
 * Initialize default settings on first run
 */
import { HACKERS_750_CARDS, HACKERS_750_DECK } from '@/lib/hackers-vocab-750';
import { upsertCards } from './repositories/card';
import { upsertDecks } from './repositories/deck';
import { getDeckCardCount } from './repositories/deck';
import { initializeSettings, setSetting } from './repositories/settings';

/**
 * Check if database has been initialized
 */
export async function isDatabaseSeeded(): Promise<boolean> {
  const count = await getDeckCardCount(HACKERS_750_DECK.id!);
  return count >= HACKERS_750_CARDS.length;
}

/**
 * Initialize the database with default settings
 * Only runs if database hasn't been initialized yet
 */
export async function seedDatabase(): Promise<void> {
  console.log('[DB] Initializing database settings...');
  await initializeSettings();
  await setSetting('dailyNewCardLimit', '50');

  const alreadySeeded = await isDatabaseSeeded();
  if (alreadySeeded) {
    console.log('[DB] Hackers 750 vocabulary already seeded');
    return;
  }

  console.log('[DB] Seeding Hackers transfer vocabulary 750...');
  await upsertDecks([HACKERS_750_DECK]);
  await upsertCards(HACKERS_750_CARDS);
  console.log('[DB] Database initialization complete');
}

/**
 * Force reinitialize the database (for development)
 * Warning: This will reset all data!
 */
export async function forceSeedDatabase(): Promise<void> {
  const { resetDatabase } = await import('./index');
  await resetDatabase();
  await seedDatabase();
}
