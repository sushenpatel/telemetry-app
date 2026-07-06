import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as telemetryApi from "../api/telemetryApi";
import { EMPTY_FILTERS, type TelemetryEntry } from "../types";
import { useTelemetry } from "./useTelemetry";

vi.mock("../api/telemetryApi", () => ({
  fetchTelemetryPage: vi.fn(),
  createTelemetryEntry: vi.fn(),
  deleteTelemetryEntry: vi.fn(),
  getApiErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
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

const fetchTelemetryPage = vi.mocked(telemetryApi.fetchTelemetryPage);
const createTelemetryEntry = vi.mocked(telemetryApi.createTelemetryEntry);
const deleteTelemetryEntry = vi.mocked(telemetryApi.deleteTelemetryEntry);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useTelemetry", () => {
  it("loads the first page and exposes items/total", async () => {
    fetchTelemetryPage.mockResolvedValue({
      items: [makeEntry({ id: 1 }), makeEntry({ id: 2 })],
      total: 5,
      limit: 50,
      offset: 0,
    });

    const { result } = renderHook(() => useTelemetry());
    expect(result.current.isInitialLoading).toBe(true);

    await act(async () => {
      await result.current.loadFirstPage(EMPTY_FILTERS);
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.total).toBe(5);
    expect(result.current.isInitialLoading).toBe(false);
    expect(result.current.hasNextPage).toBe(true);
  });

  it("appends and de-duplicates rows when fetching the next page", async () => {
    fetchTelemetryPage.mockResolvedValueOnce({
      items: [makeEntry({ id: 1 }), makeEntry({ id: 2 })],
      total: 3,
      limit: 2,
      offset: 0,
    });

    const { result } = renderHook(() => useTelemetry());
    await act(async () => {
      await result.current.loadFirstPage(EMPTY_FILTERS);
    });

    fetchTelemetryPage.mockResolvedValueOnce({
      items: [makeEntry({ id: 2 }), makeEntry({ id: 3 })], // id 2 overlaps with page 1
      total: 3,
      limit: 2,
      offset: 2,
    });

    await act(async () => {
      await result.current.fetchNextPage(EMPTY_FILTERS);
    });

    expect(result.current.items.map((i) => i.id)).toEqual([1, 2, 3]);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("does not fetch another page once everything has been loaded", async () => {
    fetchTelemetryPage.mockResolvedValueOnce({
      items: [makeEntry({ id: 1 })],
      total: 1,
      limit: 50,
      offset: 0,
    });

    const { result } = renderHook(() => useTelemetry());
    await act(async () => {
      await result.current.loadFirstPage(EMPTY_FILTERS);
    });

    fetchTelemetryPage.mockClear();
    await act(async () => {
      await result.current.fetchNextPage(EMPTY_FILTERS);
    });

    expect(fetchTelemetryPage).not.toHaveBeenCalled();
  });

  it("refetches the first page with active filters after successfully adding an entry", async () => {
    fetchTelemetryPage.mockResolvedValue({
      items: [makeEntry({ id: 1 })],
      total: 1,
      limit: 50,
      offset: 0,
    });
    createTelemetryEntry.mockResolvedValue(makeEntry({ id: 2 }));

    const { result } = renderHook(() => useTelemetry());
    await act(async () => {
      await result.current.loadFirstPage(EMPTY_FILTERS);
    });

    const filters = { satelliteId: "SAT-01", status: "" as const };
    let outcome;
    await act(async () => {
      outcome = await result.current.addEntry(
        {
          satelliteId: "SAT-01",
          timestamp: "2026-07-05T10:00:00.000Z",
          altitude: 500,
          velocity: 7.5,
          status: "healthy",
        },
        filters
      );
    });

    expect(outcome).toEqual({ ok: true });
    expect(createTelemetryEntry).toHaveBeenCalledTimes(1);
    // Called once for the initial load, once again to refresh after the add.
    expect(fetchTelemetryPage).toHaveBeenCalledTimes(2);
    expect(fetchTelemetryPage).toHaveBeenLastCalledWith(0, 50, filters);
  });

  it("returns the error message (and leaves the global banner untouched) when adding fails", async () => {
    fetchTelemetryPage.mockResolvedValue({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
    });
    createTelemetryEntry.mockRejectedValue(new Error("Satellite ID already exists"));

    const { result } = renderHook(() => useTelemetry());
    await act(async () => {
      await result.current.loadFirstPage(EMPTY_FILTERS);
    });
    fetchTelemetryPage.mockClear();

    let outcome;
    await act(async () => {
      outcome = await result.current.addEntry(
        {
          satelliteId: "SAT-01",
          timestamp: "2026-07-05T10:00:00.000Z",
          altitude: 500,
          velocity: 7.5,
          status: "healthy",
        },
        EMPTY_FILTERS
      );
    });

    // The failure is returned to the caller (the form shows it inline) rather than
    // pushed to the global error banner, which is reserved for load/list/delete errors.
    expect(outcome).toEqual({ ok: false, message: "Satellite ID already exists" });
    expect(fetchTelemetryPage).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it("removes a deleted entry from state and decrements the total", async () => {
    fetchTelemetryPage.mockResolvedValue({
      items: [makeEntry({ id: 1 }), makeEntry({ id: 2 })],
      total: 2,
      limit: 50,
      offset: 0,
    });
    deleteTelemetryEntry.mockResolvedValue(undefined);

    const { result } = renderHook(() => useTelemetry());
    await act(async () => {
      await result.current.loadFirstPage(EMPTY_FILTERS);
    });

    await act(async () => {
      await result.current.removeEntry(1);
    });

    expect(result.current.items.map((i) => i.id)).toEqual([2]);
    expect(result.current.total).toBe(1);
    expect(result.current.deletingIds.has(1)).toBe(false);
  });

  it("sets an error and clears the deleting flag when delete fails", async () => {
    fetchTelemetryPage.mockResolvedValue({
      items: [makeEntry({ id: 1 })],
      total: 1,
      limit: 50,
      offset: 0,
    });
    deleteTelemetryEntry.mockRejectedValue(new Error("Entry not found"));

    const { result } = renderHook(() => useTelemetry());
    await act(async () => {
      await result.current.loadFirstPage(EMPTY_FILTERS);
    });

    await act(async () => {
      await result.current.removeEntry(1);
    });

    expect(result.current.items).toHaveLength(1); // unchanged
    expect(result.current.deletingIds.has(1)).toBe(false);
    await waitFor(() => expect(result.current.error).toBe("Entry not found"));
  });
});
