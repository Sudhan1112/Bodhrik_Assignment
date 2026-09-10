from datetime import datetime
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
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class BookingCreate(BaseModel):
    provider_id: UUID
    service_name: str = Field(min_length=1, max_length=255)
    start_time: datetime
    end_time: datetime
    notes: str | None = None
    price_cents: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def end_after_start(self) -> "BookingCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class BookingUpdate(BaseModel):
    service_name: str | None = Field(default=None, min_length=1, max_length=255)
    start_time: datetime | None = None
    end_time: datetime | None = None
    status: BookingStatus | None = None
    notes: str | None = None
    price_cents: int | None = Field(default=None, ge=0)

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
    created_at: datetime


class ProviderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    business_name: str | None = None
    bio: str | None = None


class ProviderDetailOut(ProviderOut):
    average_rating: float | None = None
    review_count: int = 0


class SummariseResponse(BaseModel):
    job_id: UUID
    status: str
    review_count: int


class HealthOut(BaseModel):
    status: str = "ok"
