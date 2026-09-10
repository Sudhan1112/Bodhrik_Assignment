from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.cache import invalidate_bookings_cache
from app.db import get_db
from app.models import BookingStatus, Review, User, UserRole
from app.rbac import get_booking_or_404, require_role
from app.schemas import ReviewCreate, ReviewOut

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
