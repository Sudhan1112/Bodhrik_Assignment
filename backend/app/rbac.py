from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Booking, BookingStatus, User, UserRole
from app.security import decode_access_token, parse_user_id

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = parse_user_id(payload["sub"])
    except (ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from None

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User inactive or not found",
        )
    return user


def require_role(*roles: UserRole | str):
    allowed = {r.value if isinstance(r, UserRole) else r for r in roles}

    def _dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role",
            )
        return user

    return _dependency


def assert_booking_access(user: User, booking: Booking) -> None:
    """Centralized row-level ownership check. Admin bypasses."""
    if user.role == UserRole.admin.value:
        return
    if user.role == UserRole.provider.value and booking.provider_id == user.id:
        return
    if user.role == UserRole.customer.value and booking.customer_id == user.id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not allowed to access this booking",
    )


# (from_status, to_status) -> frozenset of roles allowed (admin always allowed separately)
_TRANSITION_ROLES: dict[tuple[str, str], frozenset[str]] = {
    (BookingStatus.pending.value, BookingStatus.confirmed.value): frozenset(
        {UserRole.provider.value}
    ),
    (BookingStatus.pending.value, BookingStatus.cancelled.value): frozenset(
        {UserRole.customer.value, UserRole.provider.value}
    ),
    (BookingStatus.confirmed.value, BookingStatus.completed.value): frozenset(
        {UserRole.provider.value}
    ),
    (BookingStatus.confirmed.value, BookingStatus.cancelled.value): frozenset(
        {UserRole.provider.value}
    ),
    (BookingStatus.confirmed.value, BookingStatus.no_show.value): frozenset(
        {UserRole.provider.value}
    ),
}


def assert_status_transition(user: User, booking: Booking, new_status: str) -> None:
    """
    Illegal graph edge -> 409 before role check.
    Legal edge but wrong role -> 403.
    Admin may fire any legal edge.
    """
    current = booking.status
    if current == new_status:
        return

    key = (current, new_status)
    if key not in _TRANSITION_ROLES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot transition from {current} to {new_status}",
        )

    if user.role == UserRole.admin.value:
        return

    allowed = _TRANSITION_ROLES[key]
    if user.role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role {user.role} cannot transition booking to {new_status}",
        )


def get_booking_or_404(db: Session, booking_id: UUID) -> Booking:
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return booking
