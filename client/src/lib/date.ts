// Timestamp helpers shared by the table (display) and the add form (input).
// Previously `formatTimestamp` lived in TelemetryTable and `toIsoString` in
// AddTelemetryForm; keeping them together makes the app's date handling easy to find.

/** Format an ISO 8601 string for display; falls back to the raw value if unparseable. */
export function formatTimestamp(iso: string): string {
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

/** Convert a native `datetime-local` value to a full ISO 8601 string, or null if invalid. */
export function toIsoString(datetimeLocal: string): string | null {
  const date = new Date(datetimeLocal);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
