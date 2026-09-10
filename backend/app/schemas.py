from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models import BookingStatus, UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole
    business_name: str | None = Field(default=None, max_length=255)
    bio: str | None = None
    city: str | None = Field(default=None, max_length=128)
    category: str | None = Field(default=None, max_length=64)
    avatar_url: str | None = Field(default=None, max_length=512)
    cover_url: str | None = Field(default=None, max_length=512)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    business_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    cover_url: str | None = None
    city: str | None = None
    category: str | None = None
    review_summary: str | None = None
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ServiceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    duration_minutes: int = Field(gt=0, le=24 * 60)
    price_cents: int = Field(ge=0)
    is_active: bool = True


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    duration_minutes: int | None = Field(default=None, gt=0, le=24 * 60)
    price_cents: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class ServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider_id: UUID
    name: str
    description: str | None = None
    duration_minutes: int
    price_cents: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AvailabilityRuleIn(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    is_active: bool = True

    @model_validator(mode="after")
    def end_after_start(self) -> "AvailabilityRuleIn":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class AvailabilityRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider_id: UUID
    weekday: int
    start_time: time
    end_time: time
    is_active: bool


class AvailabilityReplace(BaseModel):
    rules: list[AvailabilityRuleIn]


class BookingCreate(BaseModel):
    provider_id: UUID
    service_id: UUID
    start_time: datetime
    notes: str | None = None


class BookingUpdate(BaseModel):
    start_time: datetime | None = None
    end_time: datetime | None = None
    status: BookingStatus | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def end_after_start_when_both(self) -> "BookingUpdate":
        if self.start_time is not None and self.end_time is not None:
            if self.end_time <= self.start_time:
                raise ValueError("end_time must be after start_time")
        return self


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider_id: UUID
    customer_id: UUID
    service_id: UUID | None = None
    service_name: str
    start_time: datetime
    end_time: datetime
    status: BookingStatus
    notes: str | None = None
    price_cents: int | None = None
    created_at: datetime
    updated_at: datetime


class ReviewCreate(BaseModel):
    booking_id: UUID
    rating: int = Field(ge=1, le=5)
    comment: str | None = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("rating must be between 1 and 5")
        return v


class ReviewReply(BaseModel):
    provider_reply: str = Field(min_length=1, max_length=2000)


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    booking_id: UUID
    author_id: UUID
    provider_id: UUID
    rating: int
    comment: str | None = None
    summary: str | None = None
    summarised_at: datetime | None = None
    provider_reply: str | None = None
    replied_at: datetime | None = None
    created_at: datetime


class ProviderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    business_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    cover_url: str | None = None
    city: str | None = None
    category: str | None = None
    average_rating: float | None = None
    review_count: int = 0


class ProviderDetailOut(ProviderOut):
    review_summary: str | None = None


class ProviderListOut(BaseModel):
    items: list[ProviderOut]
    total: int
    limit: int
    offset: int


class ReviewStatsOut(BaseModel):
    average_rating: float | None = None
    review_count: int
    histogram: dict[str, int]


class SlotOut(BaseModel):
    start_time: datetime
    end_time: datetime


class SummariseResponse(BaseModel):
    job_id: UUID
    status: str
    review_count: int


class HealthOut(BaseModel):
    status: str = "ok"


class SlotsQuery(BaseModel):
    date: date
    service_id: UUID
