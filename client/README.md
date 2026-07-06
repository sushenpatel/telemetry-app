# Telemetry Dashboard Web Client
A React + TypeScript + Vite + Tailwind frontend for the FastAPI telemetry backend, styled as a
ground-station console (deep-space palette, monospace data readouts, LED-style health indicators).

## Setup
See README at top level telemetry-api directory for deployment via docker compose

# Frontend only
```bash
cd telemetry-client
npm install
npm run dev
```

The app runs at `http://localhost:5173` and talks to the FastAPI backend at
`http://localhost:8000` (see `src/api/telemetryApi.ts` — change `API_BASE_URL` if it differs).

## Testing
A lite unit test suite (Vitest + React Testing Library) covers the key pieces:

```bash
npm run test        # single run
npm run test:watch  # watch mode
```
