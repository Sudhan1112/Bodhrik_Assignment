from uuid import UUID

from tests.conftest import (
    auth_header,
    create_service,
    login,
    make_booking,
    register,
    set_weekday_hours,
)


def _pending_booking(client, db_session):
    p = register(client, "p@example.com", "provider")
    register(client, "c@example.com", "customer")
    p_tok = login(client, "p@example.com")["access_token"]
    c_tok = login(client, "c@example.com")["access_token"]
    svc = create_service(client, p_tok)
    set_weekday_hours(db_session, UUID(p["id"]), weekday=1)
    booking = make_booking(client, c_tok, p["id"], svc["id"])
    return p, p_tok, c_tok, booking, svc


def test_customer_can_cancel_pending(client, db_session):
    _, _, c_tok, booking, _ = _pending_booking(client, db_session)
    r = client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(c_tok),
        json={"status": "cancelled"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "cancelled"


def test_provider_can_confirm_pending(client, db_session):
    _, p_tok, _, booking, _ = _pending_booking(client, db_session)
    r = client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(p_tok),
        json={"status": "confirmed"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "confirmed"


def test_customer_cannot_confirm(client, db_session):
    _, _, c_tok, booking, _ = _pending_booking(client, db_session)
    r = client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(c_tok),
        json={"status": "confirmed"},
    )
    assert r.status_code == 403


def test_customer_cannot_complete(client, db_session):
    _, p_tok, c_tok, booking, _ = _pending_booking(client, db_session)
    client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(p_tok),
        json={"status": "confirmed"},
    )
    r = client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(c_tok),
        json={"status": "completed"},
    )
    assert r.status_code == 403


def test_customer_cannot_cancel_confirmed(client, db_session):
    _, p_tok, c_tok, booking, _ = _pending_booking(client, db_session)
    client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(p_tok),
        json={"status": "confirmed"},
    )
    r = client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(c_tok),
        json={"status": "cancelled"},
    )
    assert r.status_code == 403


def test_customer_cannot_no_show(client, db_session):
    _, p_tok, c_tok, booking, _ = _pending_booking(client, db_session)
    client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(p_tok),
        json={"status": "confirmed"},
    )
    r = client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(c_tok),
        json={"status": "no_show"},
    )
    assert r.status_code == 403


def test_provider_can_complete_and_no_show_and_cancel_confirmed(client, db_session):
    _, p_tok, c_tok, booking, svc = _pending_booking(client, db_session)
    client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(p_tok),
        json={"status": "confirmed"},
    )
    r = client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(p_tok),
        json={"status": "completed"},
    )
    assert r.status_code == 200

    p = register(client, "p2@example.com", "provider")
    register(client, "c2@example.com", "customer")
    p2 = login(client, "p2@example.com")["access_token"]
    c2 = login(client, "c2@example.com")["access_token"]
    svc2 = create_service(client, p2)
    set_weekday_hours(db_session, UUID(p["id"]), weekday=4)  # 2030-03-15 Friday
    set_weekday_hours(db_session, UUID(p["id"]), weekday=0)  # 2030-04-15 Monday

    b2 = make_booking(client, c2, p["id"], svc2["id"], start="2030-03-15T10:00:00Z")
    client.patch(f"/bookings/{b2['id']}", headers=auth_header(p2), json={"status": "confirmed"})
    r = client.patch(
        f"/bookings/{b2['id']}",
        headers=auth_header(p2),
        json={"status": "no_show"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "no_show"

    b3 = make_booking(client, c2, p["id"], svc2["id"], start="2030-04-15T10:00:00Z")
    client.patch(f"/bookings/{b3['id']}", headers=auth_header(p2), json={"status": "confirmed"})
    r = client.patch(
        f"/bookings/{b3['id']}",
        headers=auth_header(p2),
        json={"status": "cancelled"},
    )
    assert r.status_code == 200


def test_illegal_edge_is_409(client, db_session):
    _, p_tok, _, booking, _ = _pending_booking(client, db_session)
    r = client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(p_tok),
        json={"status": "completed"},
    )
    assert r.status_code == 409

    client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(p_tok),
        json={"status": "confirmed"},
    )
    client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(p_tok),
        json={"status": "completed"},
    )
    r = client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(p_tok),
        json={"status": "cancelled"},
    )
    assert r.status_code == 409
