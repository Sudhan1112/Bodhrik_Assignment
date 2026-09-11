# Tech stack

Only technologies present in this repository.

## Backend

| Technology | Why |
|------------|-----|
| **FastAPI** | Typed REST API with OpenAPI (`/docs`) |
| **SQLAlchemy 2** | ORM models and sessions |
| **Alembic** | Versioned Postgres migrations |
| **PostgreSQL 16** | System of record |
| **Redis 7** | Booking-list cache + summarisation queue |
| **Pydantic Settings** | Config / env loading |
| **python-jose + passlib/bcrypt** | JWT + password hashing |
| **pytest + httpx** | API tests |
| **ruff** | Python lint in CI and local |

## Frontend

| Technology | Why |
|------------|-----|
| **Next.js 14** (App Router) | Customer and provider UI |
| **React** | Component model |
| **TypeScript** | Typed client and pages |
| **Tailwind CSS** | Utility styling + design tokens |

## Infrastructure

| Technology | Why |
|------------|-----|
| **Docker Compose** | One-command API + DB + Redis + worker + frontend |
| **GitHub Actions** | Lint and tests on push/PR to `main` |

## Not in scope

No payment SDK, no real LLM provider, no message broker beyond Redis lists, no Kubernetes manifests in-repo.
