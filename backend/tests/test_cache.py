from uuid import UUID

from app.cache import STATUS_VARIANTS, bookings_list_key
from tests.conftest import (
    auth_header,
    create_service,
    login,
    make_booking,
    register,
    set_weekday_hours,
)


def test_cache_invalidated_on_write(client, fake_redis, db_session):
    p = register(client, "p@example.com", "provider")
    c = register(client, "c@example.com", "customer")
    p_tok = login(client, "p@example.com")["access_token"]
    c_tok = login(client, "c@example.com")["access_token"]
    svc = create_service(client, p_tok)
    set_weekday_hours(db_session, UUID(p["id"]), weekday=1)
    booking = make_booking(client, c_tok, p["id"], svc["id"])

    r = client.get("/bookings", headers=auth_header(c_tok))
    assert r.status_code == 200
    assert r.json()[0]["status"] == "pending"

    key = bookings_list_key(c["id"], "customer", "all")
    assert fake_redis.get(key) is not None

    r = client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(p_tok),
        json={"status": "confirmed"},
    )
    assert r.status_code == 200

    for uid, role in ((c["id"], "customer"), (p["id"], "provider")):
        for status in STATUS_VARIANTS:
            assert fake_redis.get(bookings_list_key(uid, role, status)) is None

    r = client.get("/bookings", headers=auth_header(c_tok))
    assert r.status_code == 200
    assert r.json()[0]["status"] == "confirmed"
