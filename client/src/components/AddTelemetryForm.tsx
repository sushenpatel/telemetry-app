import { useState } from "react";
import { HEALTH_STATUSES, type CreateTelemetryPayload, type HealthStatus } from "../types";

interface AddTelemetryFormProps {
  onSubmit: (payload: CreateTelemetryPayload) => Promise<{ ok: boolean; message?: string }>;
  isSubmitting: boolean;
}

interface FormState {
  satelliteId: string;
  timestamp: string; // datetime-local string
  altitude: string;
  velocity: string;
  status: HealthStatus | "";
}

const EMPTY_FORM: FormState = {
  satelliteId: "",
  timestamp: "",
  altitude: "",
  velocity: "",
  status: "",
};

type FormErrors = Partial<Record<keyof FormState, string>>;

function toIsoString(datetimeLocal: string): string | null {
  const date = new Date(datetimeLocal);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.satelliteId.trim()) {
    errors.satelliteId = "Satellite ID is required.";
  }

  if (!form.timestamp) {
    errors.timestamp = "Timestamp is required.";
  } else if (!toIsoString(form.timestamp)) {
    errors.timestamp = "Enter a valid date and time.";
  }

  if (form.altitude === "") {
    errors.altitude = "Altitude is required.";
  } else if (Number.isNaN(Number(form.altitude))) {
    errors.altitude = "Altitude must be a number.";
  } else if (Number(form.altitude) < 0) {
    errors.altitude = "Altitude cannot be negative.";
  }

  if (form.velocity === "") {
    errors.velocity = "Velocity is required.";
  } else if (Number.isNaN(Number(form.velocity))) {
    errors.velocity = "Velocity must be a number.";
  } else if (Number(form.velocity) < 0) {
    errors.velocity = "Velocity cannot be negative.";
  }

  if (!form.status) {
    errors.status = "Select a health status.";
  }

  return errors;
}

const inputClasses =
  "w-full rounded-md border bg-space-900 px-2.5 py-1.5 text-sm text-ink-100 placeholder:text-ink-500/60 font-mono focus:outline-none focus:ring-2 focus:ring-signal-cyan/40";

const labelClasses = "mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-500";

export function AddTelemetryForm({ onSubmit, isSubmitting }: AddTelemetryFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setJustAdded(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setJustAdded(false);

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const iso = toIsoString(form.timestamp)!;
    const result = await onSubmit({
      satelliteId: form.satelliteId.trim(),
      timestamp: iso,
      altitude: Number(form.altitude),
      velocity: Number(form.velocity),
      status: form.status as HealthStatus,
    });

    if (result.ok) {
      setForm(EMPTY_FORM);
      setJustAdded(true);
    } else {
      setSubmitError(result.message ?? "Failed to log entry.");
    }
  };

  const fieldClasses = (field: keyof FormState) =>
    `${inputClasses} ${errors[field] ? "border-signal-red/60 focus:ring-signal-red/40" : "border-space-600 focus:border-signal-cyan/50"}`;

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-space-600 bg-space-800/60 p-4 shadow-panel">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-500">Log New Reading</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className={labelClasses}>Satellite ID</label>
          <input
            className={fieldClasses("satelliteId")}
            placeholder="SAT-07"
            value={form.satelliteId}
            onChange={(e) => set("satelliteId", e.target.value)}
          />
          {errors.satelliteId && <p className="mt-1 text-xs text-signal-red">{errors.satelliteId}</p>}
        </div>

        <div>
          <label className={labelClasses}>Timestamp</label>
          <input
            type="datetime-local"
            step="1"
            className={fieldClasses("timestamp")}
            value={form.timestamp}
            onChange={(e) => set("timestamp", e.target.value)}
          />
          {errors.timestamp && <p className="mt-1 text-xs text-signal-red">{errors.timestamp}</p>}
        </div>

        <div>
          <label className={labelClasses}>Altitude (km)</label>
          <input
            type="number"
            step="any"
            className={fieldClasses("altitude")}
            placeholder="550.2"
            value={form.altitude}
            onChange={(e) => set("altitude", e.target.value)}
          />
          {errors.altitude && <p className="mt-1 text-xs text-signal-red">{errors.altitude}</p>}
        </div>

        <div>
          <label className={labelClasses}>Velocity (km/s)</label>
          <input
            type="number"
            step="any"
            className={fieldClasses("velocity")}
            placeholder="7.66"
            value={form.velocity}
            onChange={(e) => set("velocity", e.target.value)}
          />
          {errors.velocity && <p className="mt-1 text-xs text-signal-red">{errors.velocity}</p>}
        </div>

        <div>
          <label className={labelClasses}>Health status</label>
          <select
            className={fieldClasses("status")}
            value={form.status}
            onChange={(e) => set("status", e.target.value as FormState["status"])}
          >
            <option value="">Select status</option>
            {HEALTH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          {errors.status && <p className="mt-1 text-xs text-signal-red">{errors.status}</p>}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-md bg-signal-cyan/90 px-4 py-2 text-sm font-semibold text-space-950 transition-colors hover:bg-signal-cyan disabled:cursor-not-allowed disabled:bg-space-600 disabled:text-ink-500"
        >
          {isSubmitting && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {isSubmitting ? "Logging..." : "Log entry"}
        </button>

        {submitError && <span className="text-sm text-signal-red">{submitError}</span>}
        {justAdded && !submitError && (
          <span className="text-sm text-signal-cyan">Entry logged.</span>
        )}
      </div>
    </form>
  );
}
