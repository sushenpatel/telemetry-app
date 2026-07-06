import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { TelemetryEntry } from "../types";
import { TelemetryTable } from "./TelemetryTable";

// @tanstack/react-virtual relies on real element measurements (offsetHeight, etc.)
// which jsdom always reports as 0, so the real virtualizer would render nothing in
// tests. We swap in a lightweight fake that renders every row unvirtualized -
// fine for a unit test where the row count is small and layout isn't under test.
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: (options: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: options.count }, (_, index) => ({
        index,
        key: index,
        start: index * 44,
        size: 44,
      })),
    getTotalSize: () => options.count * 44,
  }),
}));

function makeEntry(overrides: Partial<TelemetryEntry> = {}): TelemetryEntry {
  return {
    id: 1,
    satelliteId: "SAT-01",
    timestamp: "2026-07-05T10:00:00.000Z",
    altitude: 500,
    velocity: 7.5,
    status: "healthy",
    ...overrides,
  };
}

const sampleRows: TelemetryEntry[] = [
  makeEntry({ id: 1, satelliteId: "SAT-03", altitude: 800, velocity: 7.1, status: "warning" }),
  makeEntry({ id: 2, satelliteId: "SAT-01", altitude: 400, velocity: 7.9, status: "healthy" }),
  makeEntry({ id: 3, satelliteId: "SAT-02", altitude: 600, velocity: 7.4, status: "critical" }),
];

function renderTable(overrides: Partial<ComponentProps<typeof TelemetryTable>> = {}) {
  const onLoadMore = vi.fn();
  const onDelete = vi.fn();

  render(
    <TelemetryTable
      rows={sampleRows}
      totalMatching={sampleRows.length}
      isInitialLoading={false}
      isFetchingNextPage={false}
      hasNextPage={false}
      onLoadMore={onLoadMore}
      deletingIds={new Set()}
      onDelete={onDelete}
      {...overrides}
    />
  );

  return { onLoadMore, onDelete };
}

/** Returns the satellite IDs in the order they currently appear in the DOM. */
function currentSatIdOrder(): string[] {
  return screen.getAllByText(/^SAT-0\d$/).map((el) => el.textContent ?? "");
}

describe("TelemetryTable", () => {
  it("renders a row for each telemetry entry with its column values", () => {
    renderTable();

    expect(screen.getByText("SAT-03")).toBeInTheDocument();
    expect(screen.getByText("800.00")).toBeInTheDocument();
    expect(screen.getByText("7.10")).toBeInTheDocument();
    expect(screen.getByText("Warning")).toBeInTheDocument();
  });

  it("shows the loading state while the initial page is fetching", () => {
    renderTable({ isInitialLoading: true, rows: [] });
    expect(screen.getByText(/Acquiring telemetry feed/i)).toBeInTheDocument();
  });

  it("shows an empty state when there are no matching rows", () => {
    renderTable({ rows: [] });
    expect(screen.getByText(/No telemetry entries match/i)).toBeInTheDocument();
  });

  it("sorts ascending, then descending, then clears on repeated header clicks", async () => {
    const user = userEvent.setup();
    renderTable();

    expect(currentSatIdOrder()).toEqual(["SAT-03", "SAT-01", "SAT-02"]);

    const satIdHeader = screen.getByRole("button", { name: /satellite id/i });

    await user.click(satIdHeader);
    expect(currentSatIdOrder()).toEqual(["SAT-01", "SAT-02", "SAT-03"]);

    await user.click(satIdHeader);
    expect(currentSatIdOrder()).toEqual(["SAT-03", "SAT-02", "SAT-01"]);

    await user.click(satIdHeader);
    expect(currentSatIdOrder()).toEqual(["SAT-03", "SAT-01", "SAT-02"]);
  });

  it("sorts numeric columns (e.g. Altitude) by value, not string order", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole("button", { name: /altitude/i }));

    const altitudeCells = screen.getAllByText(/^\d+\.\d{2}$/).filter((el) => el.textContent?.includes(".00"));
    // First numeric column in the row order is altitude; lowest (400.00) should now lead.
    expect(altitudeCells[0]).toHaveTextContent("400.00");
  });

  it("calls onDelete with the entry id when its delete button is clicked", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderTable();

    const row = screen.getByText("SAT-01").closest("div")!.parentElement!;
    const deleteButton = within(row).getByTitle("Delete entry");
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(2);
  });

  it("disables the delete button for a row that is currently being deleted", () => {
    renderTable({ deletingIds: new Set([2]) });

    const row = screen.getByText("SAT-01").closest("div")!.parentElement!;
    const deleteButton = within(row).getByTitle("Delete entry");
    expect(deleteButton).toBeDisabled();
  });

  it("shows the fetching-next-page indicator", () => {
    renderTable({ isFetchingNextPage: true, hasNextPage: true });
    expect(screen.getByText(/Fetching next batch/i)).toBeInTheDocument();
  });

  it("shows an end-of-feed message once there is no next page", () => {
    renderTable({ hasNextPage: false });
    expect(screen.getByText("End of feed")).toBeInTheDocument();
  });
});
