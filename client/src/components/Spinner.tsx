// Single spinner used everywhere. Size and color come from `className`
// (Tailwind height/width + text-* color, since the SVG paints currentColor),
// replacing the three near-identical inline spinners that used to live in
// TelemetryTable and AddTelemetryForm.
export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
