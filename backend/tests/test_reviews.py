from uuid import UUID

from tests.conftest import (
    auth_header,
    create_service,
    login,
    make_booking,
    register,
    set_weekday_hours,
)


def _completed_booking(client, db_session):
    p = register(client, "p@example.com", "provider")
    register(client, "c@example.com", "customer")
    register(client, "other@example.com", "customer")
    p_tok = login(client, "p@example.com")["access_token"]
    c_tok = login(client, "c@example.com")["access_token"]
    other_tok = login(client, "other@example.com")["access_token"]
    svc = create_service(client, p_tok)
    set_weekday_hours(db_session, UUID(p["id"]), weekday=1)
    booking = make_booking(client, c_tok, p["id"], svc["id"])
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
    return p, p_tok, c_tok, other_tok, booking


def test_review_only_on_completed(client, db_session):
    p = register(client, "p@example.com", "provider")
    register(client, "c@example.com", "customer")
    p_tok = login(client, "p@example.com")["access_token"]
    c_tok = login(client, "c@example.com")["access_token"]
    svc = create_service(client, p_tok)
    set_weekday_hours(db_session, UUID(p["id"]), weekday=1)
    booking = make_booking(client, c_tok, p["id"], svc["id"])

    r = client.post(
        "/reviews",
        headers=auth_header(c_tok),
        json={"booking_id": booking["id"], "rating": 5, "comment": "Great"},
    )
    assert r.status_code == 422

    client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(p_tok),
        json={"status": "confirmed"},
    )
    r = client.post(
        "/reviews",
        headers=auth_header(c_tok),
        json={"booking_id": booking["id"], "rating": 5},
    )
    assert r.status_code == 422


def test_review_cannot_be_twice(client, db_session):
    _, _, c_tok, _, booking = _completed_booking(client, db_session)
    r = client.post(
        "/reviews",
        headers=auth_header(c_tok),
        json={"booking_id": booking["id"], "rating": 4, "comment": "Good"},
    )
    assert r.status_code == 201
    r = client.post(
        "/reviews",
        headers=auth_header(c_tok),
        json={"booking_id": booking["id"], "rating": 5},
    )
    assert r.status_code == 409


def test_only_own_customer_can_review(client, db_session):
    _, _, _, other_tok, booking = _completed_booking(client, db_session)
    r = client.post(
        "/reviews",
        headers=auth_header(other_tok),
        json={"booking_id": booking["id"], "rating": 3},
    )
    assert r.status_code == 403


def test_rating_out_of_range(client, db_session):
    _, _, c_tok, _, booking = _completed_booking(client, db_session)
    r = client.post(
        "/reviews",
        headers=auth_header(c_tok),
        json={"booking_id": booking["id"], "rating": 6},
    )
    assert r.status_code == 422


def test_provider_reply(client, db_session):
    p, p_tok, c_tok, _, booking = _completed_booking(client, db_session)
    r = client.post(
        "/reviews",
        headers=auth_header(c_tok),
        json={"booking_id": booking["id"], "rating": 5, "comment": "Loved it"},
    )
    review_id = r.json()["id"]
    r = client.patch(
        f"/reviews/{review_id}/reply",
        headers=auth_header(p_tok),
        json={"provider_reply": "Thank you!"},
    )
    assert r.status_code == 200
    assert r.json()["provider_reply"] == "Thank you!"

    # other provider cannot reply
    register(client, "p2@example.com", "provider")
    p2 = login(client, "p2@example.com")["access_token"]
    # need a fresh review without reply - already has reply so 409 for owner, 403 for other
    r = client.patch(
        f"/reviews/{review_id}/reply",
        headers=auth_header(p2),
        json={"provider_reply": "Nope"},
    )
    assert r.status_code == 403
