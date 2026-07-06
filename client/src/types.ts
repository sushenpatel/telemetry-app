// Mirrors backend `TelemetryResponse` (FastAPI / Pydantic)
export interface TelemetryEntry {
  id: number;
  satelliteId: string;
  timestamp: string; // ISO 8601 datetime string
  altitude: number;
  velocity: number;
  status: HealthStatus;
}

// Mirrors backend `PaginatedTelemetryResponse`
export interface PaginatedTelemetryResponse {
  items: TelemetryEntry[];
  total: number;
  limit: number;
  offset: number;
}

// Body shape expected by POST /telemetry
export interface CreateTelemetryPayload {
  satelliteId: string;
  timestamp: string;
  altitude: number;
  velocity: number;
  status: HealthStatus;
}

export const HEALTH_STATUSES = ["healthy", "warning", "critical", "unknown"] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

// GET /telemetry only accepts `satelliteId` and `status` as optional filter query params
// (alongside `offset`/`limit`), so filtering is done server-side on just these two fields.
export interface TelemetryFilters {
  satelliteId: string;
  status: HealthStatus | "";
}

export const EMPTY_FILTERS: TelemetryFilters = {
  satelliteId: "",
  status: "",
};

export type SortableColumn = "satelliteId" | "timestamp" | "altitude" | "velocity" | "status";
export type SortDirection = "asc" | "desc";

export interface SortState {
  column: SortableColumn;
  direction: SortDirection;
}
