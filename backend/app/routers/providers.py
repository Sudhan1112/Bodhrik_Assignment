from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AvailabilityRule, Review, Service, User, UserRole
from app.queue import enqueue_summarise_job
from app.rbac import get_current_user, require_role
from app.schemas import (
    AvailabilityReplace,
    AvailabilityRuleOut,
    ProviderDetailOut,
    ProviderListOut,
    ProviderOut,
    ReviewOut,
    ReviewStatsOut,
    SlotOut,
    SummariseResponse,
)
from app.slots import generate_slots

router = APIRouter(prefix="/providers", tags=["providers"])


def _rating_agg(db: Session, provider_id: UUID) -> tuple[float | None, int]:
    agg = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .filter(Review.provider_id == provider_id)
        .one()
    )
    avg = float(agg[0]) if agg[0] is not None else None
    count = int(agg[1] or 0)
    return (round(avg, 2) if avg is not None else None), count


def _to_provider_out(user: User, avg: float | None, count: int) -> ProviderOut:
    return ProviderOut(
        id=user.id,
        full_name=user.full_name,
        business_name=user.business_name,
        bio=user.bio,
        avatar_url=user.avatar_url,
        cover_url=user.cover_url,
        city=user.city,
        category=user.category,
        average_rating=avg,
        review_count=count,
    )


@router.get("", response_model=ProviderListOut)
def list_providers(
    q: str | None = Query(default=None),
    category: str | None = Query(default=None),
    min_rating: float | None = Query(default=None, ge=1, le=5),
    limit: int = Query(default=24, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> ProviderListOut:
    query = db.query(User).filter(User.role == UserRole.provider.value, User.is_active.is_(True))
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(like),
                User.business_name.ilike(like),
                User.city.ilike(like),
                User.bio.ilike(like),
            )
        )
    if category:
        query = query.filter(User.category == category)

    providers = query.order_by(User.full_name.asc()).all()
    items: list[ProviderOut] = []
    for p in providers:
        avg, count = _rating_agg(db, p.id)
        if min_rating is not None and (avg is None or avg < min_rating):
            continue
        items.append(_to_provider_out(p, avg, count))

    total = len(items)
    page = items[offset : offset + limit]
    return ProviderListOut(items=page, total=total, limit=limit, offset=offset)


@router.get("/me/availability", response_model=list[AvailabilityRuleOut])
def get_my_availability(
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.provider)),
) -> list[AvailabilityRule]:
    return (
        db.query(AvailabilityRule)
        .filter(AvailabilityRule.provider_id == user.id)
        .order_by(AvailabilityRule.weekday.asc(), AvailabilityRule.start_time.asc())
        .all()
    )


@router.put("/me/availability", response_model=list[AvailabilityRuleOut])
def replace_my_availability(
    body: AvailabilityReplace,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.provider)),
) -> list[AvailabilityRule]:
    db.query(AvailabilityRule).filter(AvailabilityRule.provider_id == user.id).delete()
    created: list[AvailabilityRule] = []
    for rule in body.rules:
        row = AvailabilityRule(
            provider_id=user.id,
            weekday=rule.weekday,
            start_time=rule.start_time,
            end_time=rule.end_time,
            is_active=rule.is_active,
        )
        db.add(row)
        created.append(row)
    db.commit()
    for row in created:
        db.refresh(row)
    return created


@router.get("/{provider_id}", response_model=ProviderDetailOut)
def get_provider(provider_id: UUID, db: Session = Depends(get_db)) -> ProviderDetailOut:
    provider = db.get(User, provider_id)
    if provider is None or provider.role != UserRole.provider.value or not provider.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    avg, count = _rating_agg(db, provider_id)
    return ProviderDetailOut(
        id=provider.id,
        full_name=provider.full_name,
        business_name=provider.business_name,
        bio=provider.bio,
        avatar_url=provider.avatar_url,
        cover_url=provider.cover_url,
        city=provider.city,
        category=provider.category,
        average_rating=avg,
        review_count=count,
        review_summary=provider.review_summary,
    )


@router.get("/{provider_id}/slots", response_model=list[SlotOut])
def list_slots(
    provider_id: UUID,
    date: date = Query(...),
    service_id: UUID = Query(...),
    db: Session = Depends(get_db),
) -> list[SlotOut]:
    provider = db.get(User, provider_id)
    if provider is None or provider.role != UserRole.provider.value or not provider.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    service = db.get(Service, service_id)
    if service is None or service.provider_id != provider_id or not service.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    slots = generate_slots(db, provider_id=provider_id, service=service, day=date)
    return [SlotOut(start_time=s, end_time=e) for s, e in slots]


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


@router.get("/{provider_id}/reviews/stats", response_model=ReviewStatsOut)
def review_stats(provider_id: UUID, db: Session = Depends(get_db)) -> ReviewStatsOut:
    provider = db.get(User, provider_id)
    if provider is None or provider.role != UserRole.provider.value:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    avg, count = _rating_agg(db, provider_id)
    histogram = {str(i): 0 for i in range(1, 6)}
    rows = (
        db.query(Review.rating, func.count(Review.id))
        .filter(Review.provider_id == provider_id)
        .group_by(Review.rating)
        .all()
    )
    for rating, c in rows:
        histogram[str(int(rating))] = int(c)
    return ReviewStatsOut(average_rating=avg, review_count=count, histogram=histogram)


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
