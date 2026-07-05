from peewee import (
    Model, SqliteDatabase, CharField, DateTimeField, FloatField, AutoField
)

db = SqliteDatabase("telemetry.db")

class Telemetry(Model):
    """Define structure of the Telemtry table"""
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