/**
 * useDecks Hook
 * Fetches and manages deck list data from the database
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getAllDecksWithStats } from '@/lib/db';
import { adaptDecksToUI } from '@/lib/adapters';
import { pullProgressFromServer } from '@/lib/db/sync-progress';

import type { UseDecksState, UseDecksReturn } from './useDecks.type';

/**
 * Hook to fetch and manage deck list with statistics
 *
 * @example
 * ```tsx
 * function HomeScreen() {
 *   const { decks, isLoading, error, refresh } = useDecks();
 *
 *   if (isLoading) return <LoadingView />;
 *   if (error) return <ErrorView message={error.message} />;
 *
 *   return <DeckList decks={decks} onRefresh={refresh} />;
 * }
 * ```
 */
export function useDecks(): UseDecksReturn {
  const [state, setState] = useState<UseDecksState>({
    decks: [],
    isLoading: true,
    error: null,
  });

  const fetchDecks = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await pullProgressFromServer();
      const dbDecks = await getAllDecksWithStats();
      const uiDecks = adaptDecksToUI(dbDecks);

      setState({
        decks: uiDecks,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('[useDecks] Failed to fetch decks:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      }));
    }
  }, []);

  // 화면이 포커스될 때마다 덱 목록 새로고침
  // @react-navigation/native에서 import (expo-router 버전은 2회 호출 이슈 있음)
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function load() {
        try {
          await pullProgressFromServer();
          const dbDecks = await getAllDecksWithStats();

          if (mounted) {
            const uiDecks = adaptDecksToUI(dbDecks);
            setState({
              decks: uiDecks,
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          if (mounted) {
            console.error('[useDecks] Failed to fetch decks:', error);
            setState((prev) => ({
              ...prev,
              isLoading: false,
              error: error instanceof Error ? error : new Error(String(error)),
            }));
          }
        }
      }

      load();

      return () => {
        mounted = false;
      };
    }, [])
  );

  return {
    ...state,
    refresh: fetchDecks,
  };
}
