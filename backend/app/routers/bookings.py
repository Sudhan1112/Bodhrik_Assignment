from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.cache import (
    bookings_list_key,
    cache_get_json,
    cache_set_json,
    invalidate_bookings_cache,
)
from app.config import get_settings
from app.db import get_db
from app.models import Booking, BookingStatus, User, UserRole
from app.rbac import (
    assert_booking_access,
    assert_status_transition,
    get_booking_or_404,
    get_current_user,
    require_role,
)
from app.schemas import BookingCreate, BookingOut, BookingUpdate

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _serialize_bookings(rows: list[Booking]) -> list[dict]:
    return [BookingOut.model_validate(b).model_dump(mode="json") for b in rows]


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    body: BookingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.customer)),
) -> Booking:
    provider = db.get(User, body.provider_id)
    if provider is None or provider.role != UserRole.provider.value or not provider.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    booking = Booking(
        provider_id=body.provider_id,
        customer_id=user.id,
        service_name=body.service_name,
        start_time=body.start_time,
        end_time=body.end_time,
        status=BookingStatus.pending.value,
        notes=body.notes,
        price_cents=body.price_cents,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    invalidate_bookings_cache(booking.customer_id, booking.provider_id)
    return booking


@router.get("", response_model=list[BookingOut])
def list_bookings(
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Booking]:
    if status_filter is not None:
        valid = {s.value for s in BookingStatus}
        if status_filter not in valid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid status filter: {status_filter}",
            )

    settings = get_settings()
    cache_status = status_filter or "all"
    use_cache = user.role in (UserRole.customer.value, UserRole.provider.value)

    if use_cache:
        key = bookings_list_key(str(user.id), user.role, cache_status)
        cached = cache_get_json(key)
        if cached is not None:
            return [BookingOut.model_validate(item) for item in cached]  # type: ignore[return-value]

    q = db.query(Booking)
    if user.role == UserRole.customer.value:
        q = q.filter(Booking.customer_id == user.id)
    elif user.role == UserRole.provider.value:
        q = q.filter(Booking.provider_id == user.id)
    # admin: unscoped

    if status_filter is not None:
        q = q.filter(Booking.status == status_filter)

    rows = q.order_by(Booking.start_time.desc()).all()

    if use_cache:
        key = bookings_list_key(str(user.id), user.role, cache_status)
        cache_set_json(key, _serialize_bookings(rows), settings.bookings_cache_ttl_seconds)

    return rows


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(
    booking_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Booking:
    booking = get_booking_or_404(db, booking_id)
    assert_booking_access(user, booking)
    return booking


@router.patch("/{booking_id}", response_model=BookingOut)
def update_booking(
    booking_id: UUID,
    body: BookingUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Booking:
    booking = get_booking_or_404(db, booking_id)
    assert_booking_access(user, booking)

    data = body.model_dump(exclude_unset=True)

    if "status" in data and data["status"] is not None:
        new_status = (
            data["status"].value if isinstance(data["status"], BookingStatus) else data["status"]
        )
        assert_status_transition(user, booking, new_status)
        booking.status = new_status
        data.pop("status")

    start = data.get("start_time", booking.start_time)
    end = data.get("end_time", booking.end_time)
    if end <= start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_time must be after start_time",
        )

    for field, value in data.items():
        setattr(booking, field, value)

    booking.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(booking)
    invalidate_bookings_cache(booking.customer_id, booking.provider_id)
    return booking


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking(
    booking_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    booking = get_booking_or_404(db, booking_id)
    assert_booking_access(user, booking)
    customer_id, provider_id = booking.customer_id, booking.provider_id
    db.delete(booking)
    db.commit()
    invalidate_bookings_cache(customer_id, provider_id)
