import { useEffect, useState } from "react";
import { AddTelemetryForm } from "./components/AddTelemetryForm";
import { FilterBar } from "./components/FilterBar";
import { TelemetryTable } from "./components/TelemetryTable";
import { useTelemetry } from "./hooks/useTelemetry";
import { EMPTY_FILTERS, type TelemetryFilters } from "./types";

const FILTER_DEBOUNCE_MS = 300;

export default function App() {
  const {
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
  } = useTelemetry();

  const [filters, setFilters] = useState<TelemetryFilters>(EMPTY_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState<TelemetryFilters>(EMPTY_FILTERS);

  // Debounce so the satellite ID text field doesn't fire a request per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedFilters(filters), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [filters]);

  // Filtering is server-side (GET /telemetry?satelliteId=&status=), so any change to the
  // debounced filters means we restart pagination from offset 0 with the new filters.
  useEffect(() => {
    loadFirstPage(debouncedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilters.satelliteId, debouncedFilters.status]);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-signal-cyan">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current signal-dot" />
            <span className="font-mono text-xs uppercase tracking-[0.2em]">Ground Station Console</span>
          </div>
          <h1 className="text-2xl font-semibold text-ink-100 sm:text-3xl">Satellite Telemetry Dashboard</h1>
          <p className="text-sm text-ink-500">
            Live feed of orbital telemetry — {total.toLocaleString()} matching records.
          </p>
        </header>

        {error && (
          <div className="flex items-center justify-between rounded-lg border border-signal-red/40 bg-signal-red/10 px-4 py-3 text-sm text-signal-red">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-signal-red/70 hover:text-signal-red">
              Dismiss
            </button>
          </div>
        )}

        <AddTelemetryForm
          onSubmit={(payload) => addEntry(payload, debouncedFilters)}
          isSubmitting={isSubmitting}
        />

        <FilterBar
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters(EMPTY_FILTERS)}
          totalMatches={total}
          loadedCount={items.length}
        />

        <TelemetryTable
          rows={items}
          totalMatching={total}
          isInitialLoading={isInitialLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          onLoadMore={() => fetchNextPage(debouncedFilters)}
          deletingIds={deletingIds}
          onDelete={removeEntry}
        />
      </div>
    </div>
  );
}
