from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from peewee import DoesNotExist

from database import db, Telemetry, init_db
from schemas import (
    TelemetryEntry, TelemetryResponse, HealthStatus, PaginatedTelemetryResponse
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Satellite Telemetry API", lifespan=lifespan)

# Allows cross-origin requests from front end which is on a different port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def db_connection_middleware(request, call_next):
    db.connect(reuse_if_open=True)
    try:
        response = await call_next(request)
    finally:
        if not db.is_closed():
            db.close()
    return response



@app.get("/telemetry", response_model=PaginatedTelemetryResponse)
def get_telemetry(
    satelliteId: Optional[str] = Query(None, description="Filter by satellite ID"),
    status: Optional[HealthStatus] = Query(None, description="Filter by health status"),
    limit: int = Query(20, ge=1, le=100, description="Max number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
):
    query = Telemetry.select()
    if satelliteId:
        query = query.where(Telemetry.satelliteId == satelliteId)
    if status:
        query = query.where(Telemetry.status == status.value)

    total = query.count()
    results = query.order_by(Telemetry.id).limit(limit).offset(offset)
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [entry.to_dict() for entry in results],
    }

@app.get("/telemetry/{entry_id}", response_model=TelemetryResponse)
def get_telemetry_by_id(entry_id: int):
    try:
        entry = Telemetry.get_by_id(entry_id)
    except DoesNotExist:
        raise HTTPException(status_code=404, detail=f"Telemetry entry {entry_id} not found")
    
    # Returning a dict here will automatically validate with response_model type in the decorator
    return entry.to_dict()


@app.post("/telemetry", response_model=TelemetryResponse, status_code=201)
def create_telemetry(payload: TelemetryEntry):
    entry = Telemetry.create(
        satelliteId=payload.satelliteId,
        timestamp=payload.timestamp,
        altitude=payload.altitude,
        velocity=payload.velocity,
        status=payload.status.value,
    )

    # Returning a dict here will automatically validate with response_model type in the decorator
    return entry.to_dict()


@app.delete("/telemetry/{entry_id}")
def delete_telemetry(entry_id: int):
    try:
        entry = Telemetry.get_by_id(entry_id)
    except DoesNotExist:
        raise HTTPException(status_code=404, detail=f"Telemetry entry {entry_id} not found")

    entry.delete_instance()
    return {"message": f"Telemetry entry {entry_id} deleted"}