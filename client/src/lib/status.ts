import type { HealthStatus } from "../types";

// Single source of truth for how each health status is labelled and styled.
// Previously the label was derived ad hoc (`s[0].toUpperCase() + s.slice(1)`) in
// both dropdowns AND hardcoded again in StatusBadge's own style map; now the
// dropdowns and the badge all read from here.

export interface StatusMeta {
  label: string;
  text: string; // Tailwind text-color class (badge text + LED dot inherit this)
  ring: string; // Tailwind ring-color class for the badge outline
  pulse: boolean; // whether the LED dot animates (live feed)
}

export const STATUS_META: Record<HealthStatus, StatusMeta> = {
  healthy: { label: "Healthy", text: "text-signal-cyan", ring: "ring-signal-cyan/30", pulse: true },
  warning: { label: "Warning", text: "text-signal-amber", ring: "ring-signal-amber/30", pulse: false },
  critical: { label: "Critical", text: "text-signal-red", ring: "ring-signal-red/30", pulse: false },
  unknown: { label: "Unknown", text: "text-signal-slate", ring: "ring-signal-slate/30", pulse: false },
};

/** Metadata for a status value, tolerant of unexpected strings (falls back to "unknown"). */
export function statusMeta(status: string): StatusMeta {
  return (STATUS_META as Record<string, StatusMeta>)[status] ?? STATUS_META.unknown;
}

/** Human-readable label for a status value. */
export function statusLabel(status: string): string {
  return statusMeta(status).label;
}
