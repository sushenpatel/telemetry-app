def test_create_telemetry_success(client, sample_payload):
    response = client.post("/telemetry", json=sample_payload)

    assert response.status_code == 201
    data = response.json()
    assert data["satelliteId"] == "SAT-001"
    assert data["status"] == "healthy"
    assert data["altitude"] == 300.9
    assert data["velocity"] == 7034.5
    assert "id" in data


def test_create_telemetry_invalid_input(client, sample_payload):
    payload = sample_payload.copy()
    del payload["altitude"]
    response = client.post("/telemetry", json=payload)
    assert response.status_code == 422  # FastAPI/Pydantic validation error

    payload = sample_payload.copy()
    payload["status"] = "invalid_status"
    response = client.post("/telemetry", json=payload)
    assert response.status_code == 422

    payload = sample_payload.copy()
    payload["timestamp"] = "not_a_date"
    response = client.post("/telemetry", json=payload)
    assert response.status_code == 422


def test_get_all_telemetry(client, sample_payload):
    response = client.get("/telemetry")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []

    client.post("/telemetry", json=sample_payload)
    response = client.get("/telemetry")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["satelliteId"] == "SAT-001"


def test_get_telemetry_filtered(client, sample_payload):
    client.post("/telemetry", json=sample_payload)
    critical_payload = sample_payload.copy()
    critical_payload["satelliteId"] = "SAT-002"
    critical_payload["status"] = "critical"
    client.post("/telemetry", json=critical_payload)

    response = client.get("/telemetry?satelliteId=SAT-002")
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["satelliteId"] == "SAT-002"

    response = client.get("/telemetry?status=critical")
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "critical"

    response = client.get("/telemetry?satelliteId=SAT-001&status=critical")
    data = response.json()
    assert data["total"] == 0  # no entry matches both filters


def test_pagination_get(client, sample_payload):
    ids = []
    for _ in range(5):
        created = client.post("/telemetry", json=sample_payload).json()
        ids.append(created["id"])

    response = client.get("/telemetry?limit=2")
    data = response.json()
    assert data["total"] == 5
    assert data["limit"] == 2
    assert len(data["items"]) == 2

    response = client.get("/telemetry?limit=2&offset=2")
    data = response.json()
    returned_ids = [item["id"] for item in data["items"]]
    assert returned_ids == ids[2:4]


def test_pagination_limit_bounds(client):
    # limit above max (100) should be rejected
    response = client.get("/telemetry?limit=500")
    assert response.status_code == 422

    # offset below 0 should be rejected
    response = client.get("/telemetry?offset=-1")
    assert response.status_code == 422


def test_get_telemetry_by_id_success(client, sample_payload):
    created = client.post("/telemetry", json=sample_payload).json()
    response = client.get(f"/telemetry/{created['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_telemetry_by_id_not_found(client):
    response = client.get("/telemetry/9999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_delete_telemetry(client, sample_payload):
    created = client.post("/telemetry", json=sample_payload).json()

    response = client.delete("/telemetry/9999")
    assert response.status_code == 404

    response = client.delete(f"/telemetry/{created['id']}")
    assert response.status_code == 200
    assert "deleted" in response.json()["message"].lower()

    follow_up = client.get(f"/telemetry/{created['id']}")
    assert follow_up.status_code == 404
