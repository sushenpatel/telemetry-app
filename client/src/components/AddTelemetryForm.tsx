import { useState } from "react";
import { HEALTH_STATUSES, type CreateTelemetryPayload, type HealthStatus } from "../types";
import { toIsoString } from "../lib/date";
import { statusLabel } from "../lib/status";
import { Field, Select, TextInput } from "./FormControls";
import { Spinner } from "./Spinner";

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

function validateNumber(value: string, label: string): string | undefined {
  if (value === "") return `${label} is required.`;
  if (Number.isNaN(Number(value))) return `${label} must be a number.`;
  if (Number(value) <= 0) return `${label} must be positive.`;
  return undefined;
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

  const altitudeError = validateNumber(form.altitude, "Altitude");
  if (altitudeError) errors.altitude = altitudeError;

  const velocityError = validateNumber(form.velocity, "Velocity");
  if (velocityError) errors.velocity = velocityError;

  if (!form.status) {
    errors.status = "Select a health status.";
  }

  return errors;
}

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

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-space-600 bg-space-800/60 p-4 shadow-panel">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-500">Log New Reading</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Satellite ID" error={errors.satelliteId}>
          <TextInput
            hasError={!!errors.satelliteId}
            placeholder="SAT-07"
            value={form.satelliteId}
            onChange={(e) => set("satelliteId", e.target.value)}
          />
        </Field>

        <Field label="Timestamp" error={errors.timestamp}>
          <TextInput
            type="datetime-local"
            step="1"
            hasError={!!errors.timestamp}
            value={form.timestamp}
            onChange={(e) => set("timestamp", e.target.value)}
          />
        </Field>

        <Field label="Altitude (km)" error={errors.altitude}>
          <TextInput
            type="number"
            step="any"
            hasError={!!errors.altitude}
            placeholder="550.2"
            value={form.altitude}
            onChange={(e) => set("altitude", e.target.value)}
          />
        </Field>

        <Field label="Velocity (km/s)" error={errors.velocity}>
          <TextInput
            type="number"
            step="any"
            hasError={!!errors.velocity}
            placeholder="7.66"
            value={form.velocity}
            onChange={(e) => set("velocity", e.target.value)}
          />
        </Field>

        <Field label="Health status" error={errors.status}>
          <Select
            hasError={!!errors.status}
            value={form.status}
            onChange={(e) => set("status", e.target.value as FormState["status"])}
          >
            <option value="">Select status</option>
            {HEALTH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-md bg-signal-cyan/90 px-4 py-2 text-sm font-semibold text-space-950 transition-colors hover:bg-signal-cyan disabled:cursor-not-allowed disabled:bg-space-600 disabled:text-ink-500"
        >
          {isSubmitting && <Spinner className="h-4 w-4" />}
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
