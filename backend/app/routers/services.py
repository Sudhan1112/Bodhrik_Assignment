from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Service, User, UserRole
from app.rbac import get_current_user, require_role
from app.schemas import ServiceCreate, ServiceOut, ServiceUpdate

router = APIRouter(tags=["services"])


@router.get("/providers/{provider_id}/services", response_model=list[ServiceOut])
def list_provider_services(
    provider_id: UUID,
    db: Session = Depends(get_db),
) -> list[Service]:
    provider = db.get(User, provider_id)
    if provider is None or provider.role != UserRole.provider.value:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    return (
        db.query(Service)
        .filter(Service.provider_id == provider_id, Service.is_active.is_(True))
        .order_by(Service.name.asc())
        .all()
    )


@router.post(
    "/services",
    response_model=ServiceOut,
    status_code=status.HTTP_201_CREATED,
)
def create_service(
    body: ServiceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.provider)),
) -> Service:
    service = Service(
        provider_id=user.id,
        name=body.name,
        description=body.description,
        duration_minutes=body.duration_minutes,
        price_cents=body.price_cents,
        is_active=body.is_active,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.patch("/services/{service_id}", response_model=ServiceOut)
def update_service(
    service_id: UUID,
    body: ServiceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Service:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    if user.role != UserRole.admin.value and service.provider_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your service")

    data = body.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(service, field, value)
    service.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(service)
    return service


@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    service_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    if user.role != UserRole.admin.value and service.provider_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your service")
    service.is_active = False
    service.updated_at = datetime.now(timezone.utc)
    db.commit()
