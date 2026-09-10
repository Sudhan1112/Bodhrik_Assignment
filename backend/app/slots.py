"""Slot generation and booking overlap helpers."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import AvailabilityRule, Booking, BookingStatus, Service

ACTIVE_STATUSES = (
    BookingStatus.pending.value,
    BookingStatus.confirmed.value,
    BookingStatus.completed.value,
    BookingStatus.no_show.value,
)


def _ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def intervals_overlap(
    a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime
) -> bool:
    a_start, a_end = _ensure_aware(a_start), _ensure_aware(a_end)
    b_start, b_end = _ensure_aware(b_start), _ensure_aware(b_end)
    return a_start < b_end and b_start < a_end


def has_overlapping_booking(
    db: Session,
    *,
    provider_id: UUID,
    start: datetime,
    end: datetime,
    exclude_booking_id: UUID | None = None,
) -> bool:
    q = db.query(Booking).filter(
        Booking.provider_id == provider_id,
        Booking.status.in_(ACTIVE_STATUSES),
        Booking.start_time < end,
        Booking.end_time > start,
    )
    if exclude_booking_id is not None:
        q = q.filter(Booking.id != exclude_booking_id)
    return q.first() is not None


def generate_slots(
    db: Session,
    *,
    provider_id: UUID,
    service: Service,
    day: date,
) -> list[tuple[datetime, datetime]]:
    weekday = day.weekday()  # Monday=0 .. Sunday=6
    rules = (
        db.query(AvailabilityRule)
        .filter(
            AvailabilityRule.provider_id == provider_id,
            AvailabilityRule.weekday == weekday,
            AvailabilityRule.is_active.is_(True),
        )
        .all()
    )
    if not rules:
        return []

    day_start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)
    existing = (
        db.query(Booking)
        .filter(
            Booking.provider_id == provider_id,
            Booking.status.in_(ACTIVE_STATUSES),
            Booking.start_time < day_end,
            Booking.end_time > day_start,
        )
        .all()
    )

    duration = timedelta(minutes=service.duration_minutes)
    step = duration
    slots: list[tuple[datetime, datetime]] = []

    for rule in rules:
        window_start = datetime.combine(day, rule.start_time, tzinfo=timezone.utc)
        window_end = datetime.combine(day, rule.end_time, tzinfo=timezone.utc)
        cursor = window_start
        while cursor + duration <= window_end:
            slot_end = cursor + duration
            conflict = any(
                intervals_overlap(cursor, slot_end, b.start_time, b.end_time) for b in existing
            )
            if not conflict:
                slots.append((cursor, slot_end))
            cursor += step

    slots.sort(key=lambda s: s[0])
    return slots
