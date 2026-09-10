from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Review, User, UserRole
from app.queue import enqueue_summarise_job
from app.rbac import get_current_user
from app.schemas import ProviderDetailOut, ProviderOut, ReviewOut, SummariseResponse

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("", response_model=list[ProviderOut])
def list_providers(db: Session = Depends(get_db)) -> list[User]:
    return (
        db.query(User)
        .filter(User.role == UserRole.provider.value, User.is_active.is_(True))
        .order_by(User.full_name.asc())
        .all()
    )


@router.get("/{provider_id}", response_model=ProviderDetailOut)
def get_provider(provider_id: UUID, db: Session = Depends(get_db)) -> ProviderDetailOut:
    provider = db.get(User, provider_id)
    if provider is None or provider.role != UserRole.provider.value or not provider.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    agg = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .filter(Review.provider_id == provider_id)
        .one()
    )
    avg_rating = float(agg[0]) if agg[0] is not None else None
    review_count = int(agg[1] or 0)

    return ProviderDetailOut(
        id=provider.id,
        full_name=provider.full_name,
        business_name=provider.business_name,
        bio=provider.bio,
        average_rating=round(avg_rating, 2) if avg_rating is not None else None,
        review_count=review_count,
    )


@router.get("/{provider_id}/reviews", response_model=list[ReviewOut])
def list_provider_reviews(provider_id: UUID, db: Session = Depends(get_db)) -> list[Review]:
    provider = db.get(User, provider_id)
    if provider is None or provider.role != UserRole.provider.value:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    return (
        db.query(Review)
        .filter(Review.provider_id == provider_id)
        .order_by(Review.created_at.desc())
        .all()
    )


@router.post(
    "/{provider_id}/reviews/summarise",
    response_model=SummariseResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def summarise_reviews(
    provider_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SummariseResponse:
    provider = db.get(User, provider_id)
    if provider is None or provider.role != UserRole.provider.value:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    is_owner = user.role == UserRole.provider.value and user.id == provider_id
    is_admin = user.role == UserRole.admin.value
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the provider or an admin can trigger summarisation",
        )

    review_count = db.query(Review).filter(Review.provider_id == provider_id).count()
    job_id = enqueue_summarise_job(provider_id)
    return SummariseResponse(job_id=job_id, status="queued", review_count=review_count)
