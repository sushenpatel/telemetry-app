import { HEALTH_STATUSES, type TelemetryFilters } from "../types";
import { statusLabel } from "../lib/status";
import { Field, Select, TextInput } from "./FormControls";

interface FilterBarProps {
  filters: TelemetryFilters;
  onChange: (filters: TelemetryFilters) => void;
  onClear: () => void;
  totalMatches: number;
  loadedCount: number;
}

export function FilterBar({ filters, onChange, onClear, totalMatches, loadedCount }: FilterBarProps) {
  const set = <K extends keyof TelemetryFilters>(key: K, value: TelemetryFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const hasActiveFilters = filters.satelliteId !== "" || filters.status !== "";

  return (
    <div className="rounded-lg border border-space-600 bg-space-800/60 p-4 shadow-panel">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-widest text-ink-500">Filter Console</h2>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-ink-500">
            {totalMatches.toLocaleString()} matching · {loadedCount.toLocaleString()} loaded
          </span>
          {hasActiveFilters && (
            <button
              onClick={onClear}
              className="rounded-md border border-space-600 px-2.5 py-1 text-xs font-medium text-ink-300 transition-colors hover:border-signal-cyan/40 hover:text-signal-cyan"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-md">
        <Field label="Satellite ID">
          <TextInput
            placeholder="e.g. SAT-07"
            value={filters.satelliteId}
            onChange={(e) => set("satelliteId", e.target.value)}
          />
        </Field>

        <Field label="Health status">
          <Select
            value={filters.status}
            onChange={(e) => set("status", e.target.value as TelemetryFilters["status"])}
          >
            <option value="">All statuses</option>
            {HEALTH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  );
}
