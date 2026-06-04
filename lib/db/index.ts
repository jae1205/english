/**
 * Database module - expo-sqlite initialization and instance management
 */
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DATABASE_NAME = 'hackers-750-v2.db';
const LEGACY_DATABASE_NAMES = ['anki.db'];

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initializePromise: Promise<void> | null = null;

type TransactionExecutor = Pick<
  SQLite.SQLiteDatabase,
  'execAsync' | 'getAllAsync' | 'getFirstAsync' | 'runAsync'
>;

/**
 * Get the database instance (singleton)
 * Opens the database if not already open
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await openDatabaseWithRecovery();
  }
  return dbInstance;
}

async function openDatabaseWithRecovery(): Promise<SQLite.SQLiteDatabase> {
  try {
    return await openDatabaseUnchecked(DATABASE_NAME);
  } catch (error) {
    if (Platform.OS !== 'web') {
      throw error;
    }

    console.warn('[DB] Failed to open web database, recreating storage:', error);
    await deleteKnownWebDatabases();
    try {
      return await openDatabaseUnchecked(DATABASE_NAME);
    } catch (retryError) {
      console.warn('[DB] Persistent web database unavailable, using memory database:', retryError);
      return openDatabaseUnchecked(':memory:');
    }
  }
}

async function openDatabaseUnchecked(databaseName: string): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(databaseName);
  await db.execAsync('PRAGMA foreign_keys = ON;');
  return db;
}

async function deleteKnownWebDatabases(): Promise<void> {
  initializePromise = null;
  dbInstance = null;

  for (const databaseName of [DATABASE_NAME, ...LEGACY_DATABASE_NAMES]) {
    try {
      await SQLite.deleteDatabaseAsync(databaseName);
    } catch (error) {
      console.warn(`[DB] Could not delete ${databaseName}:`, error);
    }
  }
}

/**
 * Get database synchronously (for use after initialization)
 * Throws if database hasn't been initialized
 */
export function getDatabaseSync(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbInstance;
}

/**
 * Run related database writes together.
 * expo-sqlite web does not support withExclusiveTransactionAsync, so use SQL
 * transaction statements there while keeping the native transaction API.
 */
export async function runInDatabaseTransaction(
  operation: (txn: TransactionExecutor) => Promise<void>
): Promise<void> {
  const db = await getDatabase();

  if (Platform.OS !== 'web' && typeof db.withExclusiveTransactionAsync === 'function') {
    await db.withExclusiveTransactionAsync(operation);
    return;
  }

  await db.execAsync('BEGIN TRANSACTION;');
  try {
    await operation(db);
    await db.execAsync('COMMIT;');
  } catch (error) {
    try {
      await db.execAsync('ROLLBACK;');
    } catch (rollbackError) {
      console.warn('[DB] Rollback failed:', rollbackError);
    }
    throw error;
  }
}

async function initializeDatabaseInternal(): Promise<void> {
  const db = await getDatabase();

  // Import and run schema creation
  const { createTables } = await import('./schema');
  await createTables(db);

  // Seed initial data if needed
  const { seedDatabase } = await import('./seed');
  await seedDatabase();

  console.log('[DB] Database initialized successfully');
}

/**
 * Initialize the database with schema and seed data
 * Should be called once at app startup
 */
export async function initializeDatabase(): Promise<void> {
  if (!initializePromise) {
    initializePromise = initializeDatabaseInternal().catch((error) => {
      initializePromise = null;
      throw error;
    });
  }

  return initializePromise;
}

/**
 * Close the database connection
 * Call this when the app is closing
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
    console.log('[DB] Database closed');
  }
}

/**
 * Reset database (for development/testing)
 * Drops all tables and recreates them
 */
export async function resetDatabase(): Promise<void> {
  initializePromise = null;
  const db = await getDatabase();

  await db.execAsync(`
    DROP TABLE IF EXISTS review_logs;
    DROP TABLE IF EXISTS card_progress;
    DROP TABLE IF EXISTS cards;
    DROP TABLE IF EXISTS decks;
    DROP TABLE IF EXISTS settings;
  `);

  const { createTables } = await import('./schema');
  await createTables(db);

  console.log('[DB] Database reset complete');
}

// Re-export types
export type { SQLiteDatabase } from 'expo-sqlite';

// Re-export from submodules for convenience
export * from './types';
export * from './repositories';
export * from './services';
export { seedDatabase, forceSeedDatabase, isDatabaseSeeded } from './seed';

// Re-export provider
export { DatabaseProvider, useDatabaseContext, useIsDatabaseReady } from './provider';
