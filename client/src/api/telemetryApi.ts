import axios from "axios";
import type {
  CreateTelemetryPayload,
  PaginatedTelemetryResponse,
  TelemetryEntry,
  TelemetryFilters,
} from "../types";

// Configurable at build time so a Docker image isn't hardcoded to localhost:8000 —
// see the Dockerfile's VITE_API_BASE_URL build arg. Falls back to localhost:8000
// for local `npm run dev`.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export async function fetchTelemetryPage(
  offset: number,
  limit: number,
  filters?: TelemetryFilters
): Promise<PaginatedTelemetryResponse> {
  const params: Record<string, string | number> = { offset, limit };
  if (filters?.satelliteId) params.satelliteId = filters.satelliteId;
  if (filters?.status) params.status = filters.status;

  const { data } = await client.get<PaginatedTelemetryResponse>("/telemetry", { params });
  return data;
}

export async function createTelemetryEntry(
  payload: CreateTelemetryPayload
): Promise<TelemetryEntry> {
  const { data } = await client.post<TelemetryEntry>("/telemetry", payload);
  return data;
}

export async function deleteTelemetryEntry(id: number): Promise<void> {
  await client.delete(`/telemetry/${id}`);
}

/** Extracts a human-readable message from an axios/network error. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (error.response?.status) return `${fallback} (status ${error.response.status})`;
    if (error.request) return `${fallback} — could not reach the API at ${API_BASE_URL}`;
  }
  return fallback;
}
