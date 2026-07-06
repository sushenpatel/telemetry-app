import type { HealthStatus } from "../types";
import { statusMeta } from "../lib/status";

export function StatusBadge({ status }: { status: HealthStatus | string }) {
  const style = statusMeta(status);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-space-600 bg-space-800 px-2.5 py-1 text-xs font-mono uppercase tracking-wide ring-1 ${style.ring} ${style.text}`}
    >
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full bg-current ${style.pulse ? "signal-dot" : ""}`} />
      {style.label}
    </span>
  );
}
