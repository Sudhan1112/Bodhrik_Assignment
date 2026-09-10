"""Seed demo marketplace data. Idempotent by email.

Usage:
  cd backend && SEED=1 python -m scripts.seed
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, time, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.models import (  # noqa: E402
    AvailabilityRule,
    Booking,
    BookingStatus,
    Review,
    Service,
    User,
    UserRole,
)
from app.security import hash_password  # noqa: E402

COVERS = {
    "salon": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&q=80",
    "clinic": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1600&q=80",
    "consulting": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80",
}
AVATARS = {
    "salon": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
    "clinic": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80",
    "consulting": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80",
}


PROVIDERS = [
    {
        "email": "maya@ledger.demo",
        "full_name": "Maya Chen",
        "business_name": "Atelier Maya",
        "bio": "Precision cuts and colour in a calm downtown studio.",
        "city": "Austin",
        "category": "salon",
        "services": [
            ("Signature Cut", 45, 6500, "Consultation, wash, cut, and style."),
            ("Colour Refresh", 90, 14000, "Single-process colour with gloss."),
            ("Blowout", 40, 5500, "Silky finish for evening or events."),
        ],
    },
    {
        "email": "noah@ledger.demo",
        "full_name": "Dr. Noah Patel",
        "business_name": "Riverbend Wellness",
        "bio": "Primary care with same-week appointments and clear follow-ups.",
        "city": "Austin",
        "category": "clinic",
        "services": [
            ("New Patient Visit", 40, 18000, "Full intake and exam."),
            ("Follow-up", 20, 9000, "Review labs and adjust plan."),
        ],
    },
    {
        "email": "sofia@ledger.demo",
        "full_name": "Sofia Alvarez",
        "business_name": "Northline Advisory",
        "bio": "Fractional ops coaching for growing product teams.",
        "city": "Dallas",
        "category": "consulting",
        "services": [
            ("Strategy Session", 60, 25000, "One focused working session."),
            ("Team Retro Facilitation", 90, 32000, "Facilitated retro with outcomes."),
        ],
    },
    {
        "email": "james@ledger.demo",
        "full_name": "James Okonkwo",
        "business_name": "Barber James",
        "bio": "Classic and modern barbering with exact fades.",
        "city": "Houston",
        "category": "salon",
        "services": [
            ("Fade + Beard", 45, 4500, "Skin fade with beard line-up."),
            ("Classic Cut", 30, 3500, "Scissor cut and finish."),
        ],
    },
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == "maya@ledger.demo").first():
            print("Seed data already present; skipping.")
            return

        customer = User(
            email="guest@ledger.demo",
            hashed_password=hash_password("password123"),
            full_name="Alex Guest",
            role=UserRole.customer.value,
        )
        db.add(customer)
        db.flush()

        providers: list[User] = []
        first_service: Service | None = None
        for spec in PROVIDERS:
            cat = spec["category"]
            user = User(
                email=spec["email"],
                hashed_password=hash_password("password123"),
                full_name=spec["full_name"],
                role=UserRole.provider.value,
                business_name=spec["business_name"],
                bio=spec["bio"],
                city=spec["city"],
                category=cat,
                avatar_url=AVATARS[cat],
                cover_url=COVERS[cat],
            )
            db.add(user)
            db.flush()
            providers.append(user)

            for weekday in range(0, 5):
                db.add(
                    AvailabilityRule(
                        provider_id=user.id,
                        weekday=weekday,
                        start_time=time(9, 0),
                        end_time=time(17, 0),
                        is_active=True,
                    )
                )

            for name, mins, price, desc in spec["services"]:
                svc = Service(
                    provider_id=user.id,
                    name=name,
                    description=desc,
                    duration_minutes=mins,
                    price_cents=price,
                    is_active=True,
                )
                db.add(svc)
                db.flush()
                if first_service is None:
                    first_service = svc

        # Completed visit + review for first provider
        assert first_service is not None
        start = datetime.now(timezone.utc) - timedelta(days=7)
        end = start + timedelta(minutes=first_service.duration_minutes)
        booking = Booking(
            provider_id=providers[0].id,
            customer_id=customer.id,
            service_id=first_service.id,
            service_name=first_service.name,
            start_time=start,
            end_time=end,
            status=BookingStatus.completed.value,
            price_cents=first_service.price_cents,
        )
        db.add(booking)
        db.flush()
        db.add(
            Review(
                booking_id=booking.id,
                author_id=customer.id,
                provider_id=providers[0].id,
                rating=5,
                comment="Felt like a five-star studio. Exact cut, no rush.",
            )
        )

        db.commit()
        print("Seed complete. Demo logins: maya@ledger.demo / guest@ledger.demo (password123)")
    finally:
        db.close()


if __name__ == "__main__":
    if os.environ.get("SEED", "1") == "0":
        print("SEED=0; not seeding.")
        sys.exit(0)
    seed()
