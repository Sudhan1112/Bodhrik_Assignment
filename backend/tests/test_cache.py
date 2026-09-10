from app.cache import STATUS_VARIANTS, bookings_list_key
from tests.conftest import auth_header, login, make_booking, register


def test_cache_invalidated_on_write(client, fake_redis):
    p = register(client, "p@example.com", "provider")
    c = register(client, "c@example.com", "customer")
    p_tok = login(client, "p@example.com")["access_token"]
    c_tok = login(client, "c@example.com")["access_token"]
    booking = make_booking(client, c_tok, p["id"])

    # Prime customer list cache
    r = client.get("/bookings", headers=auth_header(c_tok))
    assert r.status_code == 200
    assert r.json()[0]["status"] == "pending"

    key = bookings_list_key(c["id"], "customer", "all")
    assert fake_redis.get(key) is not None

    # Provider confirms — must invalidate both parties' keys
    r = client.patch(
        f"/bookings/{booking['id']}",
        headers=auth_header(p_tok),
        json={"status": "confirmed"},
    )
    assert r.status_code == 200

    # Known enumerable set must be cleared (no KEYS)
    for uid, role in ((c["id"], "customer"), (p["id"], "provider")):
        for status in STATUS_VARIANTS:
            assert fake_redis.get(bookings_list_key(uid, role, status)) is None

    # Next list read shows fresh status, not stale pending
    r = client.get("/bookings", headers=auth_header(c_tok))
    assert r.status_code == 200
    assert r.json()[0]["status"] == "confirmed"
