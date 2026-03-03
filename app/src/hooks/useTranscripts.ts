import { useState, useEffect, useCallback, useRef } from 'react';
import { Transcript } from '../types';
import * as api from '../services/api';
import * as storage from '../services/storage';
import { processRetryQueue } from '../services/retry';

const PAGE_SIZE = 20;

export function useTranscripts() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const offsetRef = useRef(0);
  const initializedRef = useRef(false);

  // Load from cache first, then fetch from server
  const initialize = useCallback(async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      // Load cached transcripts instantly
      const cached = await storage.getTranscripts();
      if (cached.length > 0) {
        setTranscripts(cached);
        setLoading(false);
      }

      // Process retry queue
      const retried = await processRetryQueue();

      // Fetch fresh data from server
      const response = await api.getTranscripts(undefined, PAGE_SIZE, 0);
      offsetRef.current = response.transcripts.length;
      setTranscripts(response.transcripts);
      setTotal(response.total);
      setHasMore(response.has_more);

      // Update cache
      await storage.setTranscripts(response.transcripts);
    } catch {
      // If fetch fails, keep cached data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const fetchMore = useCallback(async () => {
    if (!hasMore) return;

    try {
      const response = await api.getTranscripts(undefined, PAGE_SIZE, offsetRef.current);
      offsetRef.current += response.transcripts.length;

      setTranscripts((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const newItems = response.transcripts.filter((t) => !existingIds.has(t.id));
        const merged = [...prev, ...newItems];
        storage.setTranscripts(merged);
        return merged;
      });
      setHasMore(response.has_more);
      setTotal(response.total);
    } catch {
      // Silently fail on pagination errors
    }
  }, [hasMore]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await api.getTranscripts(undefined, PAGE_SIZE, 0);
      offsetRef.current = response.transcripts.length;
      setTranscripts(response.transcripts);
      setTotal(response.total);
      setHasMore(response.has_more);
      await storage.setTranscripts(response.transcripts);
    } catch {
      // Keep existing data
    } finally {
      setRefreshing(false);
    }
  }, []);

  const addTranscript = useCallback((transcript: Transcript) => {
    setTranscripts((prev) => {
      const updated = [transcript, ...prev.filter((t) => t.id !== transcript.id)];
      storage.setTranscripts(updated);
      return updated;
    });
    setTotal((prev) => prev + 1);
  }, []);

  const removeTranscript = useCallback(async (id: string) => {
    setTranscripts((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      storage.setTranscripts(updated);
      return updated;
    });
    setTotal((prev) => Math.max(0, prev - 1));

    try {
      await api.deleteTranscript(id);
    } catch {
      // If delete fails on server, we've already removed locally
    }
  }, []);

  return {
    transcripts,
    loading,
    refreshing,
    hasMore,
    total,
    fetchMore,
    refresh,
    addTranscript,
    removeTranscript,
  };
}
