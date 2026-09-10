from tests.conftest import auth_header, login, register


def test_register_and_login(client):
    user = register(client, "cust@example.com", "customer")
    assert user["email"] == "cust@example.com"
    assert user["role"] == "customer"

    token_data = login(client, "cust@example.com")
    assert "access_token" in token_data
    assert token_data["user"]["id"] == user["id"]


def test_wrong_password(client):
    register(client, "cust@example.com", "customer")
    r = client.post(
        "/auth/login",
        json={"email": "cust@example.com", "password": "wrong-password"},
    )
    assert r.status_code == 401


def test_unauthenticated_rejected(client):
    r = client.get("/bookings")
    assert r.status_code == 401


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_bearer_required_for_protected(client):
    register(client, "cust@example.com", "customer")
    data = login(client, "cust@example.com")
    r = client.get("/bookings", headers=auth_header(data["access_token"]))
    assert r.status_code == 200
