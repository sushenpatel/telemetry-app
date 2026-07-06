import type { HealthStatus } from "../types";

const STATUS_STYLES: Record<string, { text: string; ring: string; dot: string; label: string }> = {
  healthy: {
    text: "text-signal-cyan",
    ring: "ring-signal-cyan/30",
    dot: "text-signal-cyan",
    label: "Healthy",
  },
  warning: {
    text: "text-signal-amber",
    ring: "ring-signal-amber/30",
    dot: "text-signal-amber",
    label: "Warning",
  },
  critical: {
    text: "text-signal-red",
    ring: "ring-signal-red/30",
    dot: "text-signal-red",
    label: "Critical",
  },
  unknown: {
    text: "text-signal-slate",
    ring: "ring-signal-slate/30",
    dot: "text-signal-slate",
    label: "Unknown",
  },
};

export function StatusBadge({ status }: { status: HealthStatus | string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.unknown;
  const isLive = status === "healthy";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-space-600 bg-space-800 px-2.5 py-1 text-xs font-mono uppercase tracking-wide ring-1 ${style.ring} ${style.text}`}
    >
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full bg-current ${isLive ? "signal-dot" : ""}`} />
      {style.label}
    </span>
  );
}
