# Ledger

Ledger is a service booking and review platform: providers publish services and weekly availability, customers request appointments, and completed visits can be reviewed. Redis backs a booking-list cache and a stub review-summarisation queue.

## What it demonstrates

- FastAPI REST API with Postgres schema (users, bookings, reviews, services, availability)
- Role-based access (`admin` / `provider` / `customer`) enforced in the API
- Booking CRUD including DELETE
- Redis caching (booking lists) and Redis-backed summarisation jobs + worker
- Provider/customer booking lifecycle UI
- Docker Compose end-to-end
- Automated pytest suite and GitHub Actions (lint + tests)

## Quick start

```bash
docker compose up --build
```

- App: http://localhost:3000
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## Demo accounts

Password `password123` for all seeded users.

- Customer: `guest@ledger.demo`
- Provider: `maya@ledger.demo`

Full list: [docs/DEMO_CREDENTIALS.md](docs/DEMO_CREDENTIALS.md)

## Documentation

| Doc | Contents |
|-----|----------|
| [Written note](docs/WRITTEN_NOTE.md) | Mandatory 300–500 word assessment note |
| [HLD](docs/HLD.md) | System architecture |
| [LLD](docs/LLD.md) | Schema, RBAC, API map, Redis details |
| [Setup](docs/SETUP.md) | Local + Docker setup, tests, troubleshooting |
| [Docker](docs/DOCKER.md) | Compose services and ports |
| [Tech stack](docs/TECH_STACK.md) | Libraries and infra in use |
| [Product](docs/PRODUCT.md) | Customer/provider scope and non-features |
| [User flows](docs/USER_FLOWS.md) | Mermaid UI/API flows |
| [Repo structure](docs/REPO_STRUCTURE.md) | Directory map |
| [Demo credentials](docs/DEMO_CREDENTIALS.md) | Seeded logins |

## Tests

```bash
cd backend
# PowerShell: $env:ENV="test"
pytest -q
ruff check .
```

```bash
cd frontend
npm run lint
npm run build
```
