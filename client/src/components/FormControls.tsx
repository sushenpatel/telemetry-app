import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

// Shared styling + primitives for form/filter inputs. Previously the input and
// label class strings were copy-pasted into both AddTelemetryForm and FilterBar;
// they now live here so there's a single source of truth for how a control looks.

export const labelClasses =
  "mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-500";

const controlBase =
  "w-full rounded-md border bg-space-900 px-2.5 py-1.5 text-sm text-ink-100 placeholder:text-ink-500/60 font-mono focus:outline-none focus:ring-2";

function controlClasses(hasError?: boolean): string {
  const state = hasError
    ? "border-signal-red/60 focus:ring-signal-red/40"
    : "border-space-600 focus:border-signal-cyan/50 focus:ring-signal-cyan/40";
  return `${controlBase} ${state}`;
}

/** Label + control + optional error message, laid out consistently. */
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className={labelClasses}>{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-signal-red">{error}</p>}
    </div>
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean };
export function TextInput({ hasError, ...props }: TextInputProps) {
  return <input className={controlClasses(hasError)} {...props} />;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean };
export function Select({ hasError, children, ...props }: SelectProps) {
  return (
    <select className={controlClasses(hasError)} {...props}>
      {children}
    </select>
  );
}
