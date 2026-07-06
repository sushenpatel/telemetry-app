import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SortDirection, SortState, SortableColumn, TelemetryEntry } from "../types";
import { StatusBadge } from "./StatusBadge";

interface TelemetryTableProps {
  rows: TelemetryEntry[];
  totalMatching: number;
  isInitialLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  deletingIds: Set<number>;
  onDelete: (id: number) => void;
}

const ROW_HEIGHT = 44;
const OVERSCAN = 8;
const FETCH_THRESHOLD_PX = 400;

const GRID_COLUMNS = "grid-cols-[1.1fr_1.6fr_1fr_1fr_1fr_0.7fr]";

const COLUMNS: { key: SortableColumn; label: string; align?: "right" }[] = [
  { key: "satelliteId", label: "Satellite ID" },
  { key: "timestamp", label: "Timestamp" },
  { key: "altitude", label: "Altitude (km)", align: "right" },
  { key: "velocity", label: "Velocity (km/s)", align: "right" },
  { key: "status", label: "Health Status" },
];

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function compareEntries(a: TelemetryEntry, b: TelemetryEntry, column: SortableColumn): number {
  switch (column) {
    case "satelliteId":
      return a.satelliteId.localeCompare(b.satelliteId);
    case "status":
      return a.status.localeCompare(b.status);
    case "timestamp":
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    case "altitude":
      return a.altitude - b.altitude;
    case "velocity":
      return a.velocity - b.velocity;
  }
}

function SortIcon({ direction, active }: { direction?: SortDirection; active: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`h-3 w-3 shrink-0 transition-transform ${active ? "text-signal-cyan" : "text-ink-500/60"} ${
        direction === "desc" ? "rotate-180" : ""
      }`}
      fill="none"
    >
      <path d="M6 2.5L9.5 7H2.5L6 2.5Z" fill="currentColor" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <path
        d="M3 4.5h10M6.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5m-6 0h8l-.6 8.1a1 1 0 01-1 .9H5.6a1 1 0 01-1-.9L4 4.5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-signal-cyan" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function SpinnerSmall() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function TelemetryTable({
  rows,
  totalMatching,
  isInitialLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  deletingIds,
  onDelete,
}: TelemetryTableProps) {
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<SortState | null>(null);

  // Sorting runs over whatever rows are currently loaded in the browser. The API
  // only supports offset/limit paging (plus satelliteId/status filters), not a sort
  // param, so a fully server-accurate sort across the entire dataset isn't
  // possible without a backend change to accept an `order_by` query param.
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => factor * compareEntries(a, b, sort.column));
  }, [rows, sort]);

  const rowVirtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const handleSort = (column: SortableColumn) => {
    setSort((prev) => {
      if (!prev || prev.column !== column) return { column, direction: "asc" };
      if (prev.direction === "asc") return { column, direction: "desc" };
      return null;
    });
  };

  // Infinite scroll: when the scroll position nears the bottom, request the next page.
  const handleScroll = () => {
    const el = scrollParentRef.current;
    if (!el || isFetchingNextPage || !hasNextPage) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < FETCH_THRESHOLD_PX) {
      onLoadMore();
    }
  };

  // Also catch the case where the initial page doesn't fill the viewport
  // (nothing to scroll, but more data is available).
  useEffect(() => {
    const el = scrollParentRef.current;
    if (!el || isInitialLoading || isFetchingNextPage || !hasNextPage) return;
    if (el.scrollHeight <= el.clientHeight) {
      onLoadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length, isInitialLoading, isFetchingNextPage, hasNextPage]);

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className="rounded-lg border border-space-600 bg-space-800/60 shadow-panel">
      {/* header row */}
      <div
        className={`grid ${GRID_COLUMNS} gap-6 border-b border-space-600 bg-space-900/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500 rounded-t-lg`}
      >
        {COLUMNS.map((col) => {
          const isActive = sort?.column === col.key;
          return (
            <button
              key={col.key}
              onClick={() => handleSort(col.key)}
              className={`flex items-center gap-1 transition-colors hover:text-ink-100 ${
                col.align === "right" ? "justify-end text-right" : "text-left"
              } ${isActive ? "text-signal-cyan" : ""}`}
              title={`Sort by ${col.label}`}
            >
              {col.align === "right" && <SortIcon direction={isActive ? sort.direction : undefined} active={isActive} />}
              <span>{col.label}</span>
              {col.align !== "right" && <SortIcon direction={isActive ? sort.direction : undefined} active={isActive} />}
            </button>
          );
        })}
        <div className="text-right">Actions</div>
      </div>

      <div
        ref={scrollParentRef}
        onScroll={handleScroll}
        className="telemetry-scroll relative overflow-y-auto"
        style={{ height: "560px" }}
      >
        {isInitialLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-ink-500">
            <Spinner />
            <span className="font-mono text-sm">Acquiring telemetry feed...</span>
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-ink-500">
            <span className="font-mono text-sm">No telemetry entries match the current filters.</span>
            <span className="text-xs">Adjust the filter console or log a new reading.</span>
          </div>
        ) : (
          <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
            {virtualItems.map((virtualRow) => {
              const entry = sortedRows[virtualRow.index];
              const isDeleting = deletingIds.has(entry.id);
              return (
                <div
                  key={entry.id}
                  className={`absolute left-0 top-0 grid w-full ${GRID_COLUMNS} items-center gap-6 border-b border-space-700/60 px-4 font-mono text-sm transition-colors hover:bg-space-700/30 ${
                    virtualRow.index % 2 === 0 ? "bg-transparent" : "bg-space-900/30"
                  } ${isDeleting ? "opacity-40" : ""}`}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="truncate text-ink-100">{entry.satelliteId}</div>
                  <div className="truncate text-ink-300">{formatTimestamp(entry.timestamp)}</div>
                  <div className="text-right text-ink-100">{entry.altitude.toFixed(2)}</div>
                  <div className="text-right text-ink-100">{entry.velocity.toFixed(2)}</div>
                  <div>
                    <StatusBadge status={entry.status} />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => onDelete(entry.id)}
                      disabled={isDeleting}
                      title="Delete entry"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-space-600 bg-space-900/60 text-ink-300 transition-colors hover:border-signal-red/50 hover:text-signal-red disabled:cursor-wait"
                    >
                      {isDeleting ? <SpinnerSmall /> : <TrashIcon />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isInitialLoading && isFetchingNextPage && (
          <div className="flex items-center justify-center gap-2 border-t border-space-700/60 py-3 text-ink-500">
            <Spinner />
            <span className="font-mono text-xs">Fetching next batch...</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-b-lg border-t border-space-600 bg-space-900/60 px-4 py-2 text-xs font-mono text-ink-500">
        <span>
          Showing {rows.length.toLocaleString()} of {totalMatching.toLocaleString()} records
          {sort && " (sorted within loaded rows)"}
        </span>
        {!hasNextPage && rows.length > 0 && <span>End of feed</span>}
      </div>
    </div>
  );
}
