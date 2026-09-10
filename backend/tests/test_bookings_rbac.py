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


def _pair(client, db_session):
    p = register(client, "p@example.com", "provider")
    register(client, "c@example.com", "customer")
    p_tok = login(client, "p@example.com")["access_token"]
    c_tok = login(client, "c@example.com")["access_token"]
    svc = create_service(client, p_tok)
    # 2030-01-15 is a Tuesday -> weekday 1
    set_weekday_hours(db_session, UUID(p["id"]), weekday=1, start=time(9, 0), end=time(17, 0))
    return p, p_tok, c_tok, svc


def _setup_two_providers_and_customers(client, db_session):
    p1 = register(client, "p1@example.com", "provider", full_name="Provider One")
    p2 = register(client, "p2@example.com", "provider", full_name="Provider Two")
    c1 = register(client, "c1@example.com", "customer", full_name="Customer One")
    c2 = register(client, "c2@example.com", "customer", full_name="Customer Two")
    admin = register(client, "admin@example.com", "admin", full_name="Admin")

    p1_tok = login(client, "p1@example.com")["access_token"]
    p2_tok = login(client, "p2@example.com")["access_token"]
    c1_tok = login(client, "c1@example.com")["access_token"]
    c2_tok = login(client, "c2@example.com")["access_token"]
    admin_tok = login(client, "admin@example.com")["access_token"]

    s1 = create_service(client, p1_tok, name="Cut")
    s2 = create_service(client, p2_tok, name="Color")
    set_weekday_hours(db_session, UUID(p1["id"]), weekday=1)
    set_weekday_hours(db_session, UUID(p2["id"]), weekday=4)  # 2030-02-15 Friday

    b1 = make_booking(client, c1_tok, p1["id"], s1["id"])
    b2 = make_booking(
        client,
        c2_tok,
        p2["id"],
        s2["id"],
        start="2030-02-15T10:00:00Z",
    )
    return {
        "p1": p1,
        "p2": p2,
        "c1": c1,
        "c2": c2,
        "admin": admin,
        "p1_tok": p1_tok,
        "p2_tok": p2_tok,
        "c1_tok": c1_tok,
        "c2_tok": c2_tok,
        "admin_tok": admin_tok,
        "b1": b1,
        "b2": b2,
        "s1": s1,
        "s2": s2,
    }


def test_provider_cannot_read_other_provider_booking(client, db_session):
    s = _setup_two_providers_and_customers(client, db_session)
    r = client.get(f"/bookings/{s['b2']['id']}", headers=auth_header(s["p1_tok"]))
    assert r.status_code == 403


def test_customer_cannot_read_other_customer_booking(client, db_session):
    s = _setup_two_providers_and_customers(client, db_session)
    r = client.get(f"/bookings/{s['b2']['id']}", headers=auth_header(s["c1_tok"]))
    assert r.status_code == 403


def test_list_bookings_scoped_by_role(client, db_session):
    s = _setup_two_providers_and_customers(client, db_session)

    r = client.get("/bookings", headers=auth_header(s["c1_tok"]))
    assert r.status_code == 200
    ids = {b["id"] for b in r.json()}
    assert s["b1"]["id"] in ids
    assert s["b2"]["id"] not in ids

    r = client.get("/bookings", headers=auth_header(s["p2_tok"]))
    ids = {b["id"] for b in r.json()}
    assert s["b2"]["id"] in ids
    assert s["b1"]["id"] not in ids


def test_admin_can_read_any_booking(client, db_session):
    s = _setup_two_providers_and_customers(client, db_session)
    r = client.get(f"/bookings/{s['b2']['id']}", headers=auth_header(s["admin_tok"]))
    assert r.status_code == 200
    assert r.json()["id"] == s["b2"]["id"]

    r = client.get("/bookings", headers=auth_header(s["admin_tok"]))
    assert r.status_code == 200
    assert len(r.json()) == 2


def test_provider_cannot_create_booking(client, db_session):
    p = register(client, "p@example.com", "provider")
    tok = login(client, "p@example.com")["access_token"]
    svc = create_service(client, tok)
    r = client.post(
        "/bookings",
        headers=auth_header(tok),
        json={
            "provider_id": p["id"],
            "service_id": svc["id"],
            "start_time": "2030-01-15T10:00:00Z",
        },
    )
    assert r.status_code == 403


def test_booking_requires_service_id(client, db_session):
    p = register(client, "p@example.com", "provider")
    register(client, "c@example.com", "customer")
    tok = login(client, "c@example.com")["access_token"]
    r = client.post(
        "/bookings",
        headers=auth_header(tok),
        json={
            "provider_id": p["id"],
            "service_name": "Bad",
            "start_time": "2030-01-15T11:00:00Z",
            "end_time": "2030-01-15T10:00:00Z",
        },
    )
    assert r.status_code == 422
