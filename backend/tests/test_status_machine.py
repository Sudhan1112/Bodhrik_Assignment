from tests.conftest import auth_header, login, make_booking, register


def _pending_booking(client):
    p = register(client, "p@example.com", "provider")
    register(client, "c@example.com", "customer")
    p_tok = login(client, "p@example.com")["access_token"]
    c_tok = login(client, "c@example.com")["access_token"]
    booking = make_booking(client, c_tok, p["id"])
    return p, p_tok, c_tok, booking


def test_customer_can_cancel_pending(client):
    _, _, c_tok, booking = _pending_booking(client)
    r = client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(c_tok),
        json={"status": "cancelled"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "cancelled"


def test_provider_can_confirm_pending(client):
    _, p_tok, _, booking = _pending_booking(client)
    r = client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(p_tok),
        json={"status": "confirmed"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "confirmed"


def test_customer_cannot_confirm(client):
    _, _, c_tok, booking = _pending_booking(client)
    r = client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(c_tok),
        json={"status": "confirmed"},
    )
    assert r.status_code == 403


def test_customer_cannot_complete(client):
    _, p_tok, c_tok, booking = _pending_booking(client)
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


def test_customer_cannot_cancel_confirmed(client):
    _, p_tok, c_tok, booking = _pending_booking(client)
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


def test_customer_cannot_no_show(client):
    _, p_tok, c_tok, booking = _pending_booking(client)
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


def test_provider_can_complete_and_no_show_and_cancel_confirmed(client):
    _, p_tok, c_tok, booking = _pending_booking(client)
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

    # fresh booking for no_show
    p = register(client, "p2@example.com", "provider")
    register(client, "c2@example.com", "customer")
    p2 = login(client, "p2@example.com")["access_token"]
    c2 = login(client, "c2@example.com")["access_token"]
    b2 = make_booking(
        client,
        c2,
        p["id"],
        start="2030-03-15T10:00:00Z",
        end="2030-03-15T11:00:00Z",
    )
    client.patch(f"/bookings/{b2['id']}", headers=auth_header(p2), json={"status": "confirmed"})
    r = client.patch(
        f"/bookings/{b2['id']}",
        headers=auth_header(p2),
        json={"status": "no_show"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "no_show"

    b3 = make_booking(
        client,
        c2,
        p["id"],
        start="2030-04-15T10:00:00Z",
        end="2030-04-15T11:00:00Z",
    )
    client.patch(f"/bookings/{b3['id']}", headers=auth_header(p2), json={"status": "confirmed"})
    r = client.patch(
        f"/bookings/{b3['id']}",
        headers=auth_header(p2),
        json={"status": "cancelled"},
    )
    assert r.status_code == 200


def test_illegal_edge_is_409(client):
    _, p_tok, _, booking = _pending_booking(client)
    # pending -> completed is illegal
    r = client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(p_tok),
        json={"status": "completed"},
    )
    assert r.status_code == 409

    # terminal: complete then try cancel
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
