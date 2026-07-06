import os
from peewee import (
    Model, SqliteDatabase, CharField, DateTimeField, FloatField, AutoField
)

# Defaults to a local file for plain `uv run`/local dev; in Docker this is set
# to a path outside the source directory so mounting a persistent volume there
# doesn't shadow app.py/database.py/schemas.py.
DB_PATH = os.environ.get("TELEMETRY_DB_PATH", "telemetry.db")
db = SqliteDatabase(DB_PATH)

class Telemetry(Model):
    """Define structure of the Telemetry table"""
    id = AutoField()
    satelliteId = CharField(index=True)
    timestamp = DateTimeField()
    altitude = FloatField()
    velocity = FloatField()
    status = CharField(index=True)

    class Meta:
        database = db
        table_name = "telemetry"

    def to_dict(self):
        return {
            "id": self.id,
            "satelliteId": self.satelliteId,
            "timestamp": self.timestamp.isoformat(),
            "altitude": self.altitude,
            "velocity": self.velocity,
            "status": self.status,
        }


def init_db():
    db.connect(reuse_if_open=True)
    db.create_tables([Telemetry])
    db.close()