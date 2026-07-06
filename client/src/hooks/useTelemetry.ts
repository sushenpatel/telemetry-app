import { useCallback, useRef, useState } from "react";
import {
  createTelemetryEntry,
  deleteTelemetryEntry,
  fetchTelemetryPage,
  getApiErrorMessage,
} from "../api/telemetryApi";
import type { CreateTelemetryPayload, TelemetryEntry, TelemetryFilters } from "../types";

const PAGE_SIZE = 50;

export function useTelemetry() {
  const [items, setItems] = useState<TelemetryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // requestIdRef guards against out-of-order responses when filters change quickly
  // (e.g. fast typing in the satellite ID field). isFetchingRef guards against
  // duplicate fetches firing from fast scroll events.
  const requestIdRef = useRef(0);
  const isFetchingRef = useRef(false);

  const hasNextPage = items.length < total;

  const loadFirstPage = useCallback(async (filters: TelemetryFilters) => {
    const requestId = ++requestIdRef.current;
    isFetchingRef.current = true;
    setIsInitialLoading(true);
    setError(null);
    try {
      const page = await fetchTelemetryPage(0, PAGE_SIZE, filters);
      if (requestId !== requestIdRef.current) return; // a newer request has since started
      setItems(page.items);
      setTotal(page.total);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(getApiErrorMessage(err, "Failed to load telemetry data"));
    } finally {
      if (requestId === requestIdRef.current) setIsInitialLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const fetchNextPage = useCallback(
    async (filters: TelemetryFilters) => {
      if (isFetchingRef.current) return;
      if (items.length >= total) return;

      const requestId = requestIdRef.current;
      isFetchingRef.current = true;
      setIsFetchingNextPage(true);
      setError(null);
      try {
        const page = await fetchTelemetryPage(items.length, PAGE_SIZE, filters);
        if (requestId !== requestIdRef.current) return; // filters changed mid-flight
        setItems((prev) => {
          // De-dupe in case a page overlaps with what's already loaded.
          const seen = new Set(prev.map((p) => p.id));
          const merged = [...prev];
          for (const entry of page.items) {
            if (!seen.has(entry.id)) merged.push(entry);
          }
          return merged;
        });
        setTotal(page.total);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(getApiErrorMessage(err, "Failed to load more telemetry data"));
      } finally {
        if (requestId === requestIdRef.current) setIsFetchingNextPage(false);
        isFetchingRef.current = false;
      }
    },
    [items.length, total]
  );

  const addEntry = useCallback(
    async (payload: CreateTelemetryPayload, activeFilters: TelemetryFilters) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await createTelemetryEntry(payload);
        // Refetch from the top with the active filters so the list (and total count)
        // stays a true reflection of the server, rather than guessing client-side
        // whether the new entry matches the current satelliteId/status filter.
        await loadFirstPage(activeFilters);
        return { ok: true as const };
      } catch (err) {
        // Add failures surface inline in the form via the returned message. The
        // global error banner is reserved for load/list/delete failures, so we
        // deliberately don't setError() here — otherwise the same message shows
        // up twice (banner + under the form).
        const message = getApiErrorMessage(err, "Failed to create telemetry entry");
        return { ok: false as const, message };
      } finally {
        setIsSubmitting(false);
      }
    },
    [loadFirstPage]
  );

  const removeEntry = useCallback(async (id: number) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    setError(null);
    try {
      await deleteTelemetryEntry(id);
      setItems((prev) => prev.filter((entry) => entry.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete telemetry entry"));
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  return {
    items,
    total,
    isInitialLoading,
    isFetchingNextPage,
    isSubmitting,
    deletingIds,
    error,
    hasNextPage,
    loadFirstPage,
    fetchNextPage,
    addEntry,
    removeEntry,
    setError,
  };
}
