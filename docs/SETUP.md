# Setup guide

## Prerequisites

- Docker Desktop (recommended path)
- Or locally: Python 3.12+, Node 20+, Postgres 16, Redis 7

## Docker (full stack)

From the repository root:

```bash
docker compose up --build
```

On start the API runs `alembic upgrade head`, seeds demo data (`SEED=1`), then uvicorn.

| URL | Service |
|-----|---------|
| http://localhost:3000 | Frontend |
| http://localhost:8000/docs | OpenAPI |
| http://localhost:8000/health | Health |

Demo accounts: see [DEMO_CREDENTIALS.md](DEMO_CREDENTIALS.md).

## Environment variables (API / worker)

Configured in compose or a local `.env` (see `backend/app/config.py`):

| Variable | Purpose | Compose default |
|----------|---------|-----------------|
| `DATABASE_URL` | SQLAlchemy URL | `postgresql+psycopg2://ledger:ledger@postgres:5432/ledger` |
| `REDIS_URL` | Redis | `redis://redis:6379/0` |
| `SECRET_KEY` | JWT signing | compose dev secret |
| `CORS_ORIGINS` | Allowed origins | `http://localhost:3000` |
| `ENV` | `dev` / `test` | `dev` |
| `SEED` | Run seed on API start | `1` |

Frontend build arg / env: `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## Backend locally (optional)

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Point DATABASE_URL / REDIS_URL at local Postgres + Redis
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload --port 8000
```

Worker (separate terminal):

```bash
cd backend
python -m worker.main
```

## Frontend locally (optional)

```bash
cd frontend
npm install
# NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

## Tests and lint

Backend (matches CI):

```bash
cd backend
# PowerShell: $env:ENV="test"
pytest -q
ruff check .
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Optional API lifecycle script (repo root, API must be up):

```bash
node scripts/e2e-lifecycle.mjs
```

## Troubleshooting

### Frontend on :3000 looks stale after code changes

The frontend image is a **production build**, not hot-reload. Rebuild:

```bash
docker compose up --build -d frontend
```

Or run `npm run dev` in `frontend/` against the API on `:8000`.

### Seed skipped / missing providers

Seed is upsert-by-email. Re-run:

```bash
docker compose exec api python -m scripts.seed
```
