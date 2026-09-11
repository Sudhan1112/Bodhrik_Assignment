# Ledger

Premium service booking and review marketplace: discover providers, book real availability, review completed visits.

## Stack

- **API**: FastAPI, SQLAlchemy 2, Postgres, Redis, Alembic
- **Worker**: Redis `BRPOP` review summarisation
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind
- **Auth**: JWT bearer + bcrypt

## Run with Docker

```bash
docker compose up --build
```

Brings up Postgres, Redis, API (migrates + seeds demo data), worker, and frontend.

- App: http://localhost:3000
- API docs: http://localhost:8000/docs

Demo logins after seed (password `password123` for all):

- Customer: `guest@ledger.demo`
- Provider (happy path): `maya@ledger.demo`
- ~20 competitive providers across Austin/Houston salons, Austin clinics, and Dallas consulting — emails like `lena@ledger.demo`, `noah@ledger.demo`, `sofia@ledger.demo` (see `backend/scripts/seed.py`)

## Backend tests

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
# PowerShell: $env:ENV="test"
pytest -q
ruff check .
```

## Seed locally

```bash
cd backend
# with DATABASE_URL pointing at Postgres
python -m scripts.seed
```

## Frontend

```bash
cd frontend
npm install
# NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

## Design notes

See [NOTES.md](NOTES.md).
