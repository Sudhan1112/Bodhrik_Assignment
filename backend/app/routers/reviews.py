from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.cache import invalidate_bookings_cache
from app.db import get_db
from app.models import BookingStatus, Review, User, UserRole
from app.rbac import get_booking_or_404, get_current_user, require_role
from app.schemas import ReviewCreate, ReviewOut, ReviewReply

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    body: ReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.customer)),
) -> Review:
    booking = get_booking_or_404(db, body.booking_id)

    if booking.customer_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the booking's customer can review it",
        )

    if booking.status != BookingStatus.completed.value:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Reviews are only allowed on completed bookings",
        )

    existing = db.query(Review).filter(Review.booking_id == booking.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Booking already has a review",
        )

    review = Review(
        booking_id=booking.id,
        author_id=user.id,
        provider_id=booking.provider_id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    invalidate_bookings_cache(booking.customer_id, booking.provider_id)
    return review


@router.patch("/{review_id}/reply", response_model=ReviewOut)
def reply_to_review(
    review_id: UUID,
    body: ReviewReply,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Review:
    review = db.get(Review, review_id)
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    is_owner = user.role == UserRole.provider.value and user.id == review.provider_id
    is_admin = user.role == UserRole.admin.value
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the reviewed provider can reply",
        )

    if review.provider_reply:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Review already has a reply",
        )

    review.provider_reply = body.provider_reply
    review.replied_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(review)
    return review
