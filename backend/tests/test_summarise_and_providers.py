from app.config import get_settings
from tests.conftest import auth_header, login, make_booking, register


def test_summarise_enqueues_exactly_one_job(client, fake_redis):
    p = register(client, "p@example.com", "provider")
    register(client, "c@example.com", "customer")
    p_tok = login(client, "p@example.com")["access_token"]
    c_tok = login(client, "c@example.com")["access_token"]
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
    client.post(
        "/reviews",
        headers=auth_header(c_tok),
        json={"booking_id": booking["id"], "rating": 5, "comment": "Excellent visit"},
    )

    settings = get_settings()
    assert fake_redis.llen(settings.summarise_queue_key) == 0

    r = client.post(
        f"/providers/{p['id']}/reviews/summarise",
        headers=auth_header(p_tok),
    )
    assert r.status_code == 202
    body = r.json()
    assert body["status"] == "queued"
    assert body["review_count"] == 1
    assert "job_id" in body
    assert fake_redis.llen(settings.summarise_queue_key) == 1


def test_non_owner_cannot_summarise(client, fake_redis):
    p1 = register(client, "p1@example.com", "provider")
    register(client, "p2@example.com", "provider")
    register(client, "c@example.com", "customer")
    p2_tok = login(client, "p2@example.com")["access_token"]
    c_tok = login(client, "c@example.com")["access_token"]

    r = client.post(
        f"/providers/{p1['id']}/reviews/summarise",
        headers=auth_header(p2_tok),
    )
    assert r.status_code == 403

    r = client.post(
        f"/providers/{p1['id']}/reviews/summarise",
        headers=auth_header(c_tok),
    )
    assert r.status_code == 403


def test_admin_can_summarise(client, fake_redis):
    p = register(client, "p@example.com", "provider")
    register(client, "admin@example.com", "admin")
    admin_tok = login(client, "admin@example.com")["access_token"]
    r = client.post(
        f"/providers/{p['id']}/reviews/summarise",
        headers=auth_header(admin_tok),
    )
    assert r.status_code == 202


def test_list_providers_public(client):
    register(client, "p@example.com", "provider", full_name="Ada Provider")
    register(client, "c@example.com", "customer")
    r = client.get("/providers")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["full_name"] == "Ada Provider"


def test_provider_profile_and_reviews_public(client):
    p = register(client, "p@example.com", "provider")
    register(client, "c@example.com", "customer")
    p_tok = login(client, "p@example.com")["access_token"]
    c_tok = login(client, "c@example.com")["access_token"]
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
    client.post(
        "/reviews",
        headers=auth_header(c_tok),
        json={"booking_id": booking["id"], "rating": 5, "comment": "Nice"},
    )

    r = client.get(f"/providers/{p['id']}")
    assert r.status_code == 200
    assert r.json()["average_rating"] == 5.0
    assert r.json()["review_count"] == 1

    r = client.get(f"/providers/{p['id']}/reviews")
    assert r.status_code == 200
    assert len(r.json()) == 1
