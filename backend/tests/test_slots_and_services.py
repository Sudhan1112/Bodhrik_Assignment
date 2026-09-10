from datetime import time
from uuid import UUID

from tests.conftest import (
    auth_header,
    create_service,
    login,
    make_booking,
    register,
    set_weekday_hours,
)


def test_slots_respect_hours_and_bookings(client, db_session):
    p = register(client, "p@example.com", "provider")
    register(client, "c@example.com", "customer")
    p_tok = login(client, "p@example.com")["access_token"]
    c_tok = login(client, "c@example.com")["access_token"]
    svc = create_service(client, p_tok, duration_minutes=60)
    set_weekday_hours(db_session, UUID(p["id"]), weekday=1, start=time(10, 0), end=time(12, 0))

    r = client.get(
        f"/providers/{p['id']}/slots",
        params={"date": "2030-01-15", "service_id": svc["id"]},
    )
    assert r.status_code == 200
    slots = r.json()
    assert len(slots) == 2
    starts = {s["start_time"] for s in slots}
    assert any("10:00" in s for s in starts)
    assert any("11:00" in s for s in starts)

    make_booking(client, c_tok, p["id"], svc["id"], start="2030-01-15T10:00:00Z")
    r = client.get(
        f"/providers/{p['id']}/slots",
        params={"date": "2030-01-15", "service_id": svc["id"]},
    )
    slots = r.json()
    assert len(slots) == 1
    assert "11:00" in slots[0]["start_time"]


def test_overlap_rejected(client, db_session):
    p = register(client, "p@example.com", "provider")
    register(client, "c@example.com", "customer")
    register(client, "c2@example.com", "customer")
    p_tok = login(client, "p@example.com")["access_token"]
    c_tok = login(client, "c@example.com")["access_token"]
    c2_tok = login(client, "c2@example.com")["access_token"]
    svc = create_service(client, p_tok, duration_minutes=60)
    set_weekday_hours(db_session, UUID(p["id"]), weekday=1)

    make_booking(client, c_tok, p["id"], svc["id"], start="2030-01-15T10:00:00Z")
    r = client.post(
        "/bookings",
        headers=auth_header(c2_tok),
        json={
            "provider_id": p["id"],
            "service_id": svc["id"],
            "start_time": "2030-01-15T10:30:00Z",
        },
    )
    assert r.status_code == 409


def test_availability_replace(client, db_session):
    register(client, "p@example.com", "provider")
    p_tok = login(client, "p@example.com")["access_token"]
    r = client.put(
        "/providers/me/availability",
        headers=auth_header(p_tok),
        json={
            "rules": [
                {"weekday": 0, "start_time": "09:00:00", "end_time": "17:00:00"},
                {"weekday": 2, "start_time": "10:00:00", "end_time": "14:00:00"},
            ]
        },
    )
    assert r.status_code == 200
    assert len(r.json()) == 2

    r = client.get("/providers/me/availability", headers=auth_header(p_tok))
    assert r.status_code == 200
    assert len(r.json()) == 2
