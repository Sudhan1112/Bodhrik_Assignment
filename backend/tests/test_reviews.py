from tests.conftest import auth_header, login, make_booking, register


def _completed_booking(client):
    p = register(client, "p@example.com", "provider")
    register(client, "c@example.com", "customer")
    register(client, "other@example.com", "customer")
    p_tok = login(client, "p@example.com")["access_token"]
    c_tok = login(client, "c@example.com")["access_token"]
    other_tok = login(client, "other@example.com")["access_token"]
    booking = make_booking(client, c_tok, p["id"])
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


def test_review_only_on_completed(client):
    p = register(client, "p@example.com", "provider")
    register(client, "c@example.com", "customer")
    p_tok = login(client, "p@example.com")["access_token"]
    c_tok = login(client, "c@example.com")["access_token"]
    booking = make_booking(client, c_tok, p["id"])

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


def test_review_cannot_be_twice(client):
    _, _, c_tok, _, booking = _completed_booking(client)
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


def test_only_own_customer_can_review(client):
    _, _, _, other_tok, booking = _completed_booking(client)
    r = client.post(
        "/reviews",
        headers=auth_header(other_tok),
        json={"booking_id": booking["id"], "rating": 3},
    )
    assert r.status_code == 403


def test_rating_out_of_range(client):
    _, _, c_tok, _, booking = _completed_booking(client)
    r = client.post(
        "/reviews",
        headers=auth_header(c_tok),
        json={"booking_id": booking["id"], "rating": 6},
    )
    assert r.status_code == 422
