import os

# Must be set before app imports
os.environ["ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.cache import FakeRedis, set_redis_client
from app.db import Base, get_db
from app.main import app
from app.models import BookingStatus, UserRole


@pytest.fixture()
def fake_redis():
    client = FakeRedis()
    set_redis_client(client)
    yield client
    set_redis_client(None)


@pytest.fixture()
def db_session(fake_redis):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _fk_pragma(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield session
    session.close()
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session, fake_redis):
    with TestClient(app) as c:
        yield c


def register(client: TestClient, email: str, role: str, **extra) -> dict:
    payload = {
        "email": email,
        "password": "password123",
        "full_name": extra.get("full_name", email.split("@")[0].title()),
        "role": role,
    }
    if role == UserRole.provider.value:
        payload["business_name"] = extra.get("business_name", "Test Business")
        payload["bio"] = extra.get("bio", "A test provider")
    r = client.post("/auth/register", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


def login(client: TestClient, email: str, password: str = "password123") -> dict:
    r = client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def make_booking(
    client: TestClient,
    token: str,
    provider_id: str,
    *,
    start: str = "2030-01-15T10:00:00Z",
    end: str = "2030-01-15T11:00:00Z",
    service: str = "Consultation",
) -> dict:
    r = client.post(
        "/bookings",
        headers=auth_header(token),
        json={
            "provider_id": provider_id,
            "service_name": service,
            "start_time": start,
            "end_time": end,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


__all__ = [
    "BookingStatus",
    "UserRole",
    "auth_header",
    "login",
    "make_booking",
    "register",
]
