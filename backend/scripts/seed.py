"""Seed demo marketplace data. Idempotent by email (upsert missing).

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

# Rotating image pools so competitive peers look distinct in Explore/Compare.
COVERS = {
    "salon": [
        "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&q=80",
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1600&q=80",
        "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=1600&q=80",
        "https://images.unsplash.com/photo-1633681926022-84c1235ec8c2?w=1600&q=80",
        "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1600&q=80",
        "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1600&q=80",
    ],
    "clinic": [
        "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1600&q=80",
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1600&q=80",
        "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1600&q=80",
        "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=1600&q=80",
        "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=1600&q=80",
    ],
    "consulting": [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80",
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1600&q=80",
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&q=80",
        "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600&q=80",
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=80",
    ],
}
AVATARS = {
    "salon": [
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80",
        "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80",
        "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80",
    ],
    "clinic": [
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80",
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80",
        "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80",
        "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80",
        "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80",
    ],
    "consulting": [
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80",
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80",
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80",
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80",
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80",
    ],
}

# Competitive clusters: same city+category, spread prices/ratings for Compare.
# reviews: list of (rating, comment) — seeded via completed bookings when missing.
PROVIDERS: list[dict] = [
    # --- Austin salon (6) ---
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
        "reviews": [
            (5, "Felt like a five-star studio. Exact cut, no rush."),
            (5, "Colour looked expensive and natural."),
        ],
    },
    {
        "email": "lena@ledger.demo",
        "full_name": "Lena Ortiz",
        "business_name": "South Congress Cuts",
        "bio": "Walk-friendly salon for everyday cuts and glosses.",
        "city": "Austin",
        "category": "salon",
        "services": [
            ("Everyday Cut", 40, 4800, "Wash, cut, and simple style."),
            ("Gloss Treatment", 60, 9500, "Tone and shine without full colour."),
            ("Blowout", 35, 4200, "Quick polish for the week."),
        ],
        "reviews": [
            (4, "Great value on SoCo. Slight wait but worth it."),
            (5, "Blowout lasted through humid weather."),
        ],
    },
    {
        "email": "priya@ledger.demo",
        "full_name": "Priya Shah",
        "business_name": "East Side Colour Lab",
        "bio": "Colour-first studio with careful consultations.",
        "city": "Austin",
        "category": "salon",
        "services": [
            ("Balayage Session", 120, 22000, "Custom balayage with toner."),
            ("Signature Cut", 50, 7500, "Shape tailored to your colour."),
            ("Toner Refresh", 45, 8500, "Between-colour tone correction."),
        ],
        "reviews": [
            (5, "Best balayage I've had in Austin."),
            (4, "Premium pricing, meticulous work."),
        ],
    },
    {
        "email": "diego@ledger.demo",
        "full_name": "Diego Rivera",
        "business_name": "Mueller Modern Cuts",
        "bio": "Efficient modern cuts near Mueller — no frills.",
        "city": "Austin",
        "category": "salon",
        "services": [
            ("Modern Cut", 35, 3800, "Clean cut and finish."),
            ("Cut + Beard", 45, 5000, "Haircut with beard tidy."),
        ],
        "reviews": [
            (3, "Fast and fine. Busy on weekends."),
            (4, "Solid everyday cut for the price."),
        ],
    },
    {
        "email": "aisha@ledger.demo",
        "full_name": "Aisha Brooks",
        "business_name": "Clarksville Curl Studio",
        "bio": "Curl-friendly cuts and moisture-forward styling.",
        "city": "Austin",
        "category": "salon",
        "services": [
            ("Curl Cut", 60, 8500, "Dry-cut method for natural texture."),
            ("Hydration Ritual", 75, 11000, "Deep moisture and style."),
            ("Blowout", 45, 6000, "Defined finish without crunch."),
        ],
        "reviews": [
            (5, "Finally a stylist who understands curls."),
        ],
    },
    {
        "email": "theo@ledger.demo",
        "full_name": "Theo Nguyen",
        "business_name": "Rainey Street Barbers",
        "bio": "Sharp fades and classic finishes near Rainey.",
        "city": "Austin",
        "category": "salon",
        "services": [
            ("Skin Fade", 40, 4500, "Clean fade with hot towel."),
            ("Classic Cut", 30, 3500, "Scissor cut and style."),
            ("Beard Detail", 20, 2500, "Line-up and oil."),
        ],
        "reviews": [
            (4, "Fade was crisp. Easy booking."),
            (5, "My go-to before nights out."),
        ],
    },
    # --- Houston salon (4) ---
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
        "reviews": [
            (5, "Exact fade every time."),
            (4, "Professional and on schedule."),
        ],
    },
    {
        "email": "carmen@ledger.demo",
        "full_name": "Carmen Ruiz",
        "business_name": "Montrose Hair Co.",
        "bio": "Neighbourhood salon for cuts, colour, and events.",
        "city": "Houston",
        "category": "salon",
        "services": [
            ("Signature Cut", 45, 5800, "Wash, cut, and blow-dry."),
            ("Colour Refresh", 90, 12500, "Single-process with gloss."),
            ("Event Style", 50, 7500, "Updo or polished blowout."),
        ],
        "reviews": [
            (4, "Lovely space. Colour held well."),
            (5, "Event style photographed beautifully."),
        ],
    },
    {
        "email": "marcus@ledger.demo",
        "full_name": "Marcus Lee",
        "business_name": "Heights Edge Barbers",
        "bio": "Budget-friendly fades in the Heights.",
        "city": "Houston",
        "category": "salon",
        "services": [
            ("Quick Fade", 30, 2800, "Fast fade and tidy."),
            ("Classic Cut", 25, 2200, "Simple scissor cut."),
            ("Kids Cut", 25, 2000, "Patient cuts for kids."),
        ],
        "reviews": [
            (3, "Cheap and cheerful. Can get crowded."),
            (4, "Good kids cut — patient stylist."),
        ],
    },
    {
        "email": "hana@ledger.demo",
        "full_name": "Hana Kim",
        "business_name": "Rice Village Colour House",
        "bio": "High-end colour corrections and gloss work.",
        "city": "Houston",
        "category": "salon",
        "services": [
            ("Colour Correction", 150, 28000, "Multi-process correction consult."),
            ("Signature Cut", 55, 9000, "Precision cut with finish."),
            ("Gloss Bar", 40, 7000, "Shine and tone refresh."),
        ],
        "reviews": [
            (5, "Saved a bad previous colour. Worth every cent."),
        ],
    },
    # --- Austin clinic (5) ---
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
        "reviews": [
            (5, "Clear explanations and same-week slot."),
            (4, "Thorough intake. Front desk was helpful."),
        ],
    },
    {
        "email": "amelia@ledger.demo",
        "full_name": "Dr. Amelia Cho",
        "business_name": "Zilker Family Practice",
        "bio": "Family medicine with same-day sick visits when available.",
        "city": "Austin",
        "category": "clinic",
        "services": [
            ("New Patient Visit", 45, 16000, "Comprehensive new patient exam."),
            ("Sick Visit", 20, 7500, "Acute visit for common illness."),
            ("Follow-up", 15, 6500, "Short follow-up."),
        ],
        "reviews": [
            (5, "Got a sick visit same day. Kind and efficient."),
            (4, "Good with kids. Slight wait."),
        ],
    },
    {
        "email": "raj@ledger.demo",
        "full_name": "Dr. Raj Mehta",
        "business_name": "Domain Sports Medicine",
        "bio": "Sports and musculoskeletal care near Domain.",
        "city": "Austin",
        "category": "clinic",
        "services": [
            ("Sports Eval", 40, 22000, "Injury evaluation and plan."),
            ("Follow-up", 20, 11000, "Progress check and rehab tweak."),
        ],
        "reviews": [
            (4, "Clear rehab plan after my knee tweak."),
            (5, "Sports-focused without the hospital feel."),
        ],
    },
    {
        "email": "elena@ledger.demo",
        "full_name": "Dr. Elena Vargas",
        "business_name": "Barton Creek Internal Med",
        "bio": "Internal medicine with longer visits and careful labs.",
        "city": "Austin",
        "category": "clinic",
        "services": [
            ("New Patient Visit", 50, 21000, "Extended intake and exam."),
            ("Follow-up", 25, 10500, "Labs review and plan."),
            ("Annual Physical", 40, 19000, "Preventive physical."),
        ],
        "reviews": [
            (5, "Never felt rushed. Explained every lab."),
        ],
    },
    {
        "email": "owen@ledger.demo",
        "full_name": "Dr. Owen Blake",
        "business_name": "South Austin Urgent Care",
        "bio": "Walk-in friendly urgent care with transparent pricing.",
        "city": "Austin",
        "category": "clinic",
        "services": [
            ("Urgent Visit", 25, 12000, "Acute care visit."),
            ("Follow-up", 15, 5500, "Quick check after urgent visit."),
        ],
        "reviews": [
            (3, "Fast but busy. Fine for minor issues."),
            (4, "Transparent pricing — appreciated."),
        ],
    },
    # --- Dallas consulting (5) ---
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
        "reviews": [
            (5, "Retro actually produced decisions we shipped."),
            (5, "Sharp ops instincts without fluff."),
        ],
    },
    {
        "email": "ben@ledger.demo",
        "full_name": "Ben Carter",
        "business_name": "Uptown Product Studio",
        "bio": "Product discovery sprints for B2B teams.",
        "city": "Dallas",
        "category": "consulting",
        "services": [
            ("Discovery Sprint Kickoff", 90, 28000, "Scope and interview plan."),
            ("Strategy Session", 60, 20000, "Prioritization working session."),
        ],
        "reviews": [
            (4, "Solid discovery framework. Good homework."),
            (5, "Helped us kill two roadmap zombies."),
        ],
    },
    {
        "email": "nina@ledger.demo",
        "full_name": "Nina Patel",
        "business_name": "Deep Ellum Finance Ops",
        "bio": "Fractional finance ops for early-stage companies.",
        "city": "Dallas",
        "category": "consulting",
        "services": [
            ("Cash Flow Clinic", 60, 18000, "90-day cash plan workshop."),
            ("Board Pack Review", 75, 24000, "Narrative + metrics scrub."),
        ],
        "reviews": [
            (5, "Cash plan was practical, not theoretical."),
            (4, "Board pack looked investor-ready."),
        ],
    },
    {
        "email": "chris@ledger.demo",
        "full_name": "Chris Okada",
        "business_name": "Oak Lawn Growth Lab",
        "bio": "Affordable go-to-market coaching for founders.",
        "city": "Dallas",
        "category": "consulting",
        "services": [
            ("GTM Office Hours", 45, 12000, "Focused GTM Q&A."),
            ("Strategy Session", 60, 15000, "Channel and messaging workshop."),
        ],
        "reviews": [
            (3, "Helpful but light on follow-through."),
            (4, "Good starter session for first-time founders."),
        ],
    },
    {
        "email": "mira@ledger.demo",
        "full_name": "Mira Thompson",
        "business_name": "Victory Park Leadership Co.",
        "bio": "Executive coaching for new managers and VPs.",
        "city": "Dallas",
        "category": "consulting",
        "services": [
            ("Leadership Intensive", 90, 35000, "Deep 1:1 coaching block."),
            ("Strategy Session", 60, 27000, "Stakeholder and priority map."),
            ("Team Retro Facilitation", 90, 30000, "Facilitated leadership retro."),
        ],
        "reviews": [
            (5, "Best coaching investment this year."),
            (5, "Direct, kind, and actionable."),
        ],
    },
]


def _pick_media(category: str, index: int) -> tuple[str, str]:
    covers = COVERS[category]
    avatars = AVATARS[category]
    return covers[index % len(covers)], avatars[index % len(avatars)]


def _ensure_customer(db) -> User:
    customer = db.query(User).filter(User.email == "guest@ledger.demo").first()
    if customer:
        return customer
    customer = User(
        email="guest@ledger.demo",
        hashed_password=hash_password("password123"),
        full_name="Alex Guest",
        role=UserRole.customer.value,
    )
    db.add(customer)
    db.flush()
    return customer


def _ensure_provider(db, spec: dict, index: int) -> tuple[User, bool]:
    """Create provider if missing. Returns (user, created)."""
    existing = db.query(User).filter(User.email == spec["email"]).first()
    if existing:
        return existing, False

    cat = spec["category"]
    cover, avatar = _pick_media(cat, index)
    user = User(
        email=spec["email"],
        hashed_password=hash_password("password123"),
        full_name=spec["full_name"],
        role=UserRole.provider.value,
        business_name=spec["business_name"],
        bio=spec["bio"],
        city=spec["city"],
        category=cat,
        avatar_url=avatar,
        cover_url=cover,
    )
    db.add(user)
    db.flush()

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
        db.add(
            Service(
                provider_id=user.id,
                name=name,
                description=desc,
                duration_minutes=mins,
                price_cents=price,
                is_active=True,
            )
        )
    db.flush()
    return user, True


def _ensure_reviews(db, provider: User, customer: User, review_specs: list[tuple[int, str]]) -> int:
    """Add completed booking+review pairs when provider has no reviews yet."""
    existing = db.query(Review).filter(Review.provider_id == provider.id).count()
    if existing > 0 or not review_specs:
        return 0

    service = (
        db.query(Service)
        .filter(Service.provider_id == provider.id, Service.is_active.is_(True))
        .order_by(Service.price_cents.asc())
        .first()
    )
    if service is None:
        return 0

    added = 0
    for i, (rating, comment) in enumerate(review_specs):
        start = datetime.now(timezone.utc) - timedelta(days=14 + i * 3, hours=i)
        end = start + timedelta(minutes=service.duration_minutes)
        booking = Booking(
            provider_id=provider.id,
            customer_id=customer.id,
            service_id=service.id,
            service_name=service.name,
            start_time=start,
            end_time=end,
            status=BookingStatus.completed.value,
            price_cents=service.price_cents,
        )
        db.add(booking)
        db.flush()
        db.add(
            Review(
                booking_id=booking.id,
                author_id=customer.id,
                provider_id=provider.id,
                rating=rating,
                comment=comment,
            )
        )
        added += 1
    return added


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        customer = _ensure_customer(db)
        created_providers = 0
        created_reviews = 0

        for index, spec in enumerate(PROVIDERS):
            user, created = _ensure_provider(db, spec, index)
            if created:
                created_providers += 1
            created_reviews += _ensure_reviews(
                db, user, customer, list(spec.get("reviews") or [])
            )

        db.commit()
        total = db.query(User).filter(User.role == UserRole.provider.value).count()
        print(
            f"Seed complete. providers={total} "
            f"(+{created_providers} new, +{created_reviews} reviews). "
            "Demo: maya@ledger.demo / guest@ledger.demo (password123)"
        )
    finally:
        db.close()


if __name__ == "__main__":
    if os.environ.get("SEED", "1") == "0":
        print("SEED=0; not seeding.")
        sys.exit(0)
    seed()
