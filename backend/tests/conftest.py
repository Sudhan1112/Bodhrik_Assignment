import os
from datetime import time

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
from app.models import AvailabilityRule, BookingStatus, UserRole


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
        payload["city"] = extra.get("city", "Austin")
        payload["category"] = extra.get("category", "salon")
    r = client.post("/auth/register", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


def login(client: TestClient, email: str, password: str = "password123") -> dict:
    r = client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def create_service(
    client: TestClient,
    token: str,
    *,
    name: str = "Consultation",
    duration_minutes: int = 60,
    price_cents: int = 5000,
) -> dict:
    r = client.post(
        "/services",
        headers=auth_header(token),
        json={
            "name": name,
            "duration_minutes": duration_minutes,
            "price_cents": price_cents,
            "description": "Test service",
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


def set_weekday_hours(
    db_session,
    provider_id,
    *,
    weekday: int = 1,
    start: time = time(9, 0),
    end: time = time(17, 0),
) -> None:
    """weekday: Monday=0 .. Sunday=6. Default Tuesday for 2030-01-15."""
    db_session.add(
        AvailabilityRule(
            provider_id=provider_id,
            weekday=weekday,
            start_time=start,
            end_time=end,
            is_active=True,
        )
    )
    db_session.commit()


def make_booking(
    client: TestClient,
    token: str,
    provider_id: str,
    service_id: str,
    *,
    start: str = "2030-01-15T10:00:00Z",
    notes: str | None = None,
) -> dict:
    payload = {
        "provider_id": provider_id,
        "service_id": service_id,
        "start_time": start,
    }
    if notes is not None:
        payload["notes"] = notes
    r = client.post("/bookings", headers=auth_header(token), json=payload)
    assert r.status_code == 201, r.text
    return r.json()


__all__ = [
    "BookingStatus",
    "UserRole",
    "auth_header",
    "create_service",
    "login",
    "make_booking",
    "register",
    "set_weekday_hours",
]
