import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { EMPTY_FILTERS, type TelemetryFilters } from "../types";
import { FilterBar } from "./FilterBar";

function setup(overrides?: Partial<ComponentProps<typeof FilterBar>>) {
  const onChange = vi.fn();
  const onClear = vi.fn();
  const filters: TelemetryFilters = overrides?.filters ?? EMPTY_FILTERS;

  render(
    <FilterBar
      filters={filters}
      onChange={onChange}
      onClear={onClear}
      totalMatches={overrides?.totalMatches ?? 0}
      loadedCount={overrides?.loadedCount ?? 0}
    />
  );

  return { onChange, onClear };
}

/**
 * FilterBar's inputs are fully controlled by the `filters` prop, exactly like
 * App.tsx uses it (state lives in the parent, updated via onChange). A test
 * that renders FilterBar with a *static* filters object and never feeds
 * onChange's result back in would see the input reset to that static value on
 * every re-render mid-keystroke, so typing "SAT-01" would only ever report the
 * single most recent character. This wrapper mimics the real parent so
 * multi-character typing accumulates the way it does in the app.
 */
function ControlledFilterBar({ onChangeSpy }: { onChangeSpy: (filters: TelemetryFilters) => void }) {
  const [filters, setFilters] = useState<TelemetryFilters>(EMPTY_FILTERS);
  return (
    <FilterBar
      filters={filters}
      onChange={(next) => {
        setFilters(next);
        onChangeSpy(next);
      }}
      onClear={() => setFilters(EMPTY_FILTERS)}
      totalMatches={0}
      loadedCount={0}
    />
  );
}

describe("FilterBar", () => {
  it("only exposes satellite ID and health status filters", () => {
    setup();
    expect(screen.getByPlaceholderText("e.g. SAT-07")).toBeInTheDocument();
    expect(screen.getByText("Health status")).toBeInTheDocument();

    // No timestamp/altitude/velocity range fields should be present.
    expect(screen.queryByText(/Timestamp from/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Altitude min/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Velocity min/i)).not.toBeInTheDocument();
  });

  it("calls onChange with the updated satellite ID as the user types", async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(<ControlledFilterBar onChangeSpy={onChangeSpy} />);

    const input = screen.getByPlaceholderText("e.g. SAT-07");
    await user.type(input, "SAT-01");

    // onChangeSpy fires once per keystroke; the final call should reflect the full string
    // now that the wrapper feeds each update back in as the new `filters` prop.
    expect(onChangeSpy).toHaveBeenCalled();
    const lastCall = onChangeSpy.mock.calls.at(-1)?.[0] as TelemetryFilters;
    expect(lastCall.satelliteId).toBe("SAT-01");
  });

  it("calls onChange when a health status is selected", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.selectOptions(screen.getByDisplayValue("All statuses"), "critical");

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, status: "critical" });
  });

  it("only shows the Clear filters button when a filter is active", () => {
    const { rerender } = render(
      <FilterBar filters={EMPTY_FILTERS} onChange={vi.fn()} onClear={vi.fn()} totalMatches={0} loadedCount={0} />
    );
    expect(screen.queryByText("Clear filters")).not.toBeInTheDocument();

    rerender(
      <FilterBar
        filters={{ satelliteId: "SAT-01", status: "" }}
        onChange={vi.fn()}
        onClear={vi.fn()}
        totalMatches={1}
        loadedCount={1}
      />
    );
    expect(screen.getByText("Clear filters")).toBeInTheDocument();
  });

  it("calls onClear when the Clear filters button is clicked", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <FilterBar
        filters={{ satelliteId: "SAT-01", status: "" }}
        onChange={vi.fn()}
        onClear={onClear}
        totalMatches={1}
        loadedCount={1}
      />
    );

    await user.click(screen.getByText("Clear filters"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
