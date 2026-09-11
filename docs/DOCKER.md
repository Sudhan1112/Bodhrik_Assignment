# Docker

Full stack is defined in [`docker-compose.yml`](../docker-compose.yml).

## Start

```bash
docker compose up --build
```

## Services

| Service | Purpose | Port |
|---------|---------|------|
| `postgres` | PostgreSQL 16 | `5432` |
| `redis` | Redis 7 (cache + queue) | `6379` |
| `api` | FastAPI (migrate + seed + uvicorn) | `8000` |
| `worker` | Summarisation consumer (`python -m worker.main`) | (none published) |
| `frontend` | Next.js production server | `3000` |

## Healthchecks

- **postgres**: `pg_isready -U ledger -d ledger`
- **redis**: `redis-cli ping`

## Dependencies

- `api` and `worker` wait until postgres and redis are healthy.
- `frontend` depends on `api`.

## API container command

1. `alembic upgrade head`
2. `python -m scripts.seed`
3. `uvicorn app.main:app --host 0.0.0.0 --port 8000`

## Volumes

`postgres_data` persists the database across restarts.

## Rebuild notes

- API/worker: rebuild when backend code changes (`docker compose up --build -d api worker`).
- Frontend: rebuild when UI changes (`docker compose up --build -d frontend`) — image is not `next dev` watch mode.
