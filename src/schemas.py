from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, field_validator


class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


class TelemetryEntry(BaseModel):
    satelliteId: str = Field(min_length=1)
    timestamp: datetime
    altitude: float
    velocity: float
    status: HealthStatus

    model_config = {
        "json_schema_extra": {          # sample request body for docs
            "example": {
                "satelliteId": "SAT-001",
                "timestamp": "2026-07-04T12:00:00Z",
                "altitude": 550.2,
                "velocity": 7.66,
                "status": "healthy",
            }
        },
        "str_strip_whitespace": True,   # auto-trim strings
        "extra": "forbid",              # reject unexpected fields in the request body
        "frozen": True,                 # make the model immutable after creation
    }

    @field_validator("altitude", "velocity")
    @classmethod
    def check_valid(cls, value: int) -> int:
        if value < 0:
            raise ValueError("Altitude and Velocity must be positive numbers.")
        return value


class TelemetryResponse(BaseModel):
    id: int
    satelliteId: str
    timestamp: datetime
    altitude: float
    velocity: float
    status: str


class PaginatedTelemetryResponse(BaseModel):
    items: list[TelemetryResponse]
    total: int
    limit: int
    offset: int
