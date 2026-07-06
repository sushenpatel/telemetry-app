import sys
import os
import tempfile
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from peewee import SqliteDatabase

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from database import Telemetry  # noqa: E402
import app as app_module  # noqa: E402


@pytest.fixture(scope="session")
def test_db_path():
    """Create a temp file-backed SQLite DB for the test session."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    yield path
    os.remove(path)


@pytest.fixture(scope="session", autouse=True)
def bind_test_db(test_db_path):
    """Point the Telemetry model at a temp file DB for the whole test session."""
    test_db = SqliteDatabase(test_db_path)
    Telemetry.bind(test_db, bind_refs=False, bind_backrefs=False)
    test_db.connect()
    test_db.create_tables([Telemetry])
    yield test_db
    test_db.drop_tables([Telemetry])
    test_db.close()


@pytest.fixture(autouse=True)
def clean_table():
    """Wipe all rows before every test so tests don't leak state into each other."""
    Telemetry.delete().execute()
    yield


@pytest.fixture
def client():
    return TestClient(app_module.app)


@pytest.fixture
def sample_payload():
    return {
        "satelliteId": "SAT-001",
        "timestamp": datetime(2026, 7, 4, 12, 0, 0, tzinfo=timezone.utc).isoformat(),
        "altitude": 300.9,
        "velocity": 7034.5,
        "status": "healthy",
    }