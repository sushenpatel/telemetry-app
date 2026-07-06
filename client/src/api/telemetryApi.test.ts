import { beforeEach, describe, expect, it, vi } from "vitest";

// axios.create() is called once at module load time inside telemetryApi.ts, so we
// need the same mock client object handed back every time `create` is invoked.
// vi.hoisted lets us define it before vi.mock's factory (which itself is hoisted
// above all imports) runs.
const { mockClient, isAxiosErrorMock } = vi.hoisted(() => ({
  mockClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  isAxiosErrorMock: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mockClient),
    isAxiosError: isAxiosErrorMock,
  },
}));

import {
  createTelemetryEntry,
  deleteTelemetryEntry,
  fetchTelemetryPage,
  getApiErrorMessage,
} from "./telemetryApi";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("fetchTelemetryPage", () => {
  it("requests offset/limit only when no filters are given", async () => {
    mockClient.get.mockResolvedValue({ data: { items: [], total: 0, limit: 50, offset: 0 } });

    await fetchTelemetryPage(0, 50);

    expect(mockClient.get).toHaveBeenCalledWith("/telemetry", {
      params: { offset: 0, limit: 50 },
    });
  });

  it("includes satelliteId in the query params when provided", async () => {
    mockClient.get.mockResolvedValue({ data: { items: [], total: 0, limit: 50, offset: 0 } });

    await fetchTelemetryPage(0, 50, { satelliteId: "SAT-01", status: "" });

    expect(mockClient.get).toHaveBeenCalledWith("/telemetry", {
      params: { offset: 0, limit: 50, satelliteId: "SAT-01" },
    });
  });

  it("includes status in the query params when provided", async () => {
    mockClient.get.mockResolvedValue({ data: { items: [], total: 0, limit: 50, offset: 0 } });

    await fetchTelemetryPage(10, 25, { satelliteId: "", status: "critical" });

    expect(mockClient.get).toHaveBeenCalledWith("/telemetry", {
      params: { offset: 10, limit: 25, status: "critical" },
    });
  });

  it("returns the parsed paginated response", async () => {
    const page = { items: [{ id: 1 }], total: 1, limit: 50, offset: 0 };
    mockClient.get.mockResolvedValue({ data: page });

    const result = await fetchTelemetryPage(0, 50);
    expect(result).toEqual(page);
  });
});

describe("createTelemetryEntry", () => {
  it("posts the payload and returns the created entry", async () => {
    const payload = {
      satelliteId: "SAT-42",
      timestamp: "2026-07-05T10:00:00.000Z",
      altitude: 500,
      velocity: 7.6,
      status: "healthy" as const,
    };
    const created = { id: 99, ...payload };
    mockClient.post.mockResolvedValue({ data: created });

    const result = await createTelemetryEntry(payload);

    expect(mockClient.post).toHaveBeenCalledWith("/telemetry", payload);
    expect(result).toEqual(created);
  });
});

describe("deleteTelemetryEntry", () => {
  it("calls delete with the entry id in the URL", async () => {
    mockClient.delete.mockResolvedValue({});

    await deleteTelemetryEntry(42);

    expect(mockClient.delete).toHaveBeenCalledWith("/telemetry/42");
  });
});

describe("getApiErrorMessage", () => {
  it("returns the fallback for a non-axios error", () => {
    isAxiosErrorMock.mockReturnValue(false);
    expect(getApiErrorMessage(new Error("boom"), "Failed to load data")).toBe("Failed to load data");
  });

  it("prefers the server-provided detail message when present", () => {
    isAxiosErrorMock.mockReturnValue(true);
    const error = { response: { status: 400, data: { detail: "satelliteId is required" } } };
    expect(getApiErrorMessage(error, "Failed to load data")).toBe("satelliteId is required");
  });

  it("falls back to a status-based message when there's no detail", () => {
    isAxiosErrorMock.mockReturnValue(true);
    const error = { response: { status: 500, data: {} } };
    expect(getApiErrorMessage(error, "Failed to load data")).toBe("Failed to load data (status 500)");
  });

  it("mentions the API URL when the request never got a response", () => {
    isAxiosErrorMock.mockReturnValue(true);
    const error = { request: {} };
    expect(getApiErrorMessage(error, "Failed to load data")).toBe(
      "Failed to load data — could not reach the API at http://localhost:8000"
    );
  });
});
