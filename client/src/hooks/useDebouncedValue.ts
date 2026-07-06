import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delayMs` has
 * passed without a change. Extracted from App, where the debounce was previously
 * an inline effect + a second piece of state.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
