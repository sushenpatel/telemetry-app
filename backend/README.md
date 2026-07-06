# Telemetry Backend REST API
FastAPI based telemetry backend for creation, retrieval, and deletion of satellite telemetry records.
Uses uv to manage dependencies and virtual environment.

## Setup
See README at top level telemetry-api directory for deployment via docker compose

Once app is running, visit http://localhost:8000/docs for API usage documentation

## Testing
First install uv

```bash
cd telemetry-api
uv run pytest
```

## Note: Backend CORS

Since the frontend (port 5173) and backend (port 8000) are different origins, FastAPI app 
allows CORS from the dev server.

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```