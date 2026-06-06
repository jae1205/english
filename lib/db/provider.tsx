/**
 * Database Provider
 * Wraps the app to ensure database is initialized before rendering
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { initializeDatabase, getDatabase, resetDatabase, type SQLiteDatabase } from './index';
import { Colors, FontFamily } from '@/constants/theme';

interface DatabaseContextValue {
  db: SQLiteDatabase | null;
  isReady: boolean;
  error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextValue>({
  db: null,
  isReady: false,
  error: null,
});

interface DatabaseProviderProps {
  children: React.ReactNode;
}

/**
 * Database Provider component
 * Ensures database is initialized before rendering children
 */
export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [state, setState] = useState<DatabaseContextValue>({
    db: null,
    isReady: false,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        try {
          await initializeDatabase();
        } catch (initialError) {
          console.warn('[DB] Initialization failed, resetting database once:', initialError);
          await resetDatabase();
          await initializeDatabase();
        }

        const db = await getDatabase();
        const { pullProgressFromServer } = await import('./sync-progress');
        await pullProgressFromServer();

        if (mounted) {
          setState({ db, isReady: true, error: null });
        }
      } catch (error) {
        console.error('[DB] Initialization failed:', error);
        if (mounted) {
          setState({
            db: null,
            isReady: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Loading state
  if (!state.isReady && !state.error) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Error state
  if (state.error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Database Error</Text>
        <Text style={styles.errorMessage}>{state.error.message}</Text>
      </View>
    );
  }

  return (
    <DatabaseContext.Provider value={state}>
      {children}
    </DatabaseContext.Provider>
  );
}

/**
 * Hook to access database context
 * @returns DatabaseContextValue with db instance, ready state, and any error
 */
export function useDatabaseContext(): DatabaseContextValue {
  const context = useContext(DatabaseContext);
  if (!context.isReady) {
    throw new Error('useDatabaseContext must be used within a DatabaseProvider');
  }
  return context;
}

/**
 * Hook to check if database is ready
 */
export function useIsDatabaseReady(): boolean {
  const context = useContext(DatabaseContext);
  return context.isReady;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: FontFamily.medium,
    color: Colors.dark.textSecondary,
  },
  errorText: {
    fontSize: 20,
    fontFamily: FontFamily.semiBold,
    color: Colors.dark.error,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.dark.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
