# Satellite Telemetry Dashboard

## Setup and Deployment
```bash
docker compose build --no-cache
docker compose up -d (detached)
```

## Teardown
```bash
docker compose down (maintains persistent database entries)
docker compose down -v (deletes persistent database)
```

(could also use Makefile for shortcuts)

## Testing
Unit tests for both the backend and front end (see README's in each respective directory).

For live testing follow the Docker deployment instructions above and navigate to http://localhost:5173 in a local browser. This will allow you to manually enter telemetry data records and see them populate in the Telemetry table and perform various actions to exercise the backend REST API calls and front end functionality from the requirements.

To test the REST endpoints directly, use url http://localhost:8000 (API docs are hosted at http://localhost:8000/docs)

Examples:
```bash
curl -X POST http://localhost:8000/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "satelliteId": "SAT-001",
    "timestamp": "2026-07-04T12:00:00Z",
    "altitude": 550.2,
    "velocity": 7.66,
    "status": "healthy"
  }'

curl "http://localhost:8000/telemetry"
curl "http://localhost:8000/telemetry?satelliteId=SAT-001&status=healthy"
curl http://localhost:8000/telemetry/1
curl -X DELETE http://localhost:8000/telemetry/1
```


## BackEnd Dev Notes
- I chose FastAPI in the Python backend because I've worked with it in the past and like that it is built natively with Pydantic validation which allows me enforce type constraints and build custom validators for input fields. Also it allows for easy API documentation (http://localhost:8000/docs)

- Chose peewee as a lightweight SQL library since we have a simple data structure here and I'd rather not use SQL query language. Could also have used the dataset package or sqlite3, or an in memory data structure but I wanted to implement it with data persistence across service restarts.

- Pagination method
    Offset based (used here for simplicity) - provide offset and limit
    Other options:
    Page based - provide page size and page number
    Keyset based - provide an key id to begin results and limit
    Cursor based - provide cursor to start from and limit, returns a new cursor

- NOTE: Concurrent requests/access to database
    Since there is no endpoint to update an existing entry, this doesn't seem like as much of an issue. But depending on how the consumer is implemented and frequency of requests, a Lock could be implmented on the database so that consumers are not simultaneously trying to access while one is trying to update, since FastAPI is asynchronous and can handle multiple requests concurrently.

## Front End Dev Notes (with help from Claude AI)
- **`src/hooks/useTelemetry.ts`** — all state management (loaded items, total count, loading/error/
  deleting flags) and the three API operations (paginated fetch, create, delete). Newly created
  entries are prepended locally so they appear immediately without a refetch.

- **`src/components/TelemetryTable.tsx`** — a virtualized, infinite-scrolling table.
  `@tanstack/react-virtual` renders only the visible rows (+ a small overscan buffer) so the DOM
  stays light even with thousands of loaded rows. A scroll handler requests the next page 
  once the user scrolls within ~400px of the bottom.

- **`src/components/FilterBar.tsx`** — filters by satellite ID and health status. These are sent to the server and
  debounced by 300ms so typing doesn't fire a request for every keystroke. Because filtering happens
  server-side, changing a filter resets pagination back to offset 0 with the new filter applied.

- **`src/components/AddTelemetryForm.tsx`** — validates satellite ID, date-timestamp, altitude ≥ 0,
  velocity ≥ 0 before commiting to the database. On success, the table refetches the
  first page with the active filters so the list and total count stay a true reflection of the
  server.

- **`src/components/StatusBadge.tsx`** — health status rendered as a small pulsing LED

- **Sorting** — click any column header in the telemetry table to sort ascending, click again for 
  descending, a third click clears the sort. Since the API doesn't return an ordered list, this sorts 
  whatever rows are currently loaded in the browser rather than the full dataset — the table footer
  notes this when a sort is active. To make sorting fully accurate across the entire dataset, I'd
  have to add a a server-side `order_by` option to `GET /telemetry`.

- **Delete** — a dedicated Actions column on the right of the table holds the delete button for
  each row, with a per-row spinner while the delete request is in flight.

## Frontend Unit Testing (with help from Claude AI)
- **`src/components/StatusBadge.test.tsx`** — label rendering for each health status, unknown fallback.
- **`src/components/FilterBar.test.tsx`** — only exposes satellite ID / status, fires `onChange`/`onClear` correctly.
- **`src/components/AddTelemetryForm.test.tsx`** — required-field and negative-number validation, successful
  submit builds the right payload (including ISO timestamp conversion) and resets the form, server error
  messages surface without wiping user input.
- **`src/components/TelemetryTable.test.tsx`** — renders rows/columns, empty and loading states, header-click
  sorting (asc → desc → cleared, including numeric vs. string columns), delete button wiring and its disabled
  state while a row is mid-delete. `@tanstack/react-virtual` is mocked here since it depends on real element
  measurements that jsdom always reports as zero.
- **`src/hooks/useTelemetry.test.ts`** — pagination (append + de-dupe, stops at `hasNextPage`), add-then-refetch
  behavior, delete success/failure paths, all against a mocked API layer.
- **`src/api/telemetryApi.test.ts`** — query params are built correctly from `offset`/`limit`/`satelliteId`/`status`,
  and `getApiErrorMessage` picks the right message for server-detail, status-only, and no-response errors.

This intentionally isn't exhaustive — it's meant to catch regressions in the logic-heavy parts: validation, pagination/filtering state, sorting, and API plumbing.

## Notes / assumptions
- Timestamps are entered via a native `datetime-local` input and converted to full ISO 8601
  (`Date.toISOString()`) before being sent.
- Delete shows a per-row spinner and dims that row while the request is in flight; add shows a
  spinner in the submit button.
