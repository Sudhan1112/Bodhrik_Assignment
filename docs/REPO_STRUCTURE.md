# Repository structure

High-level layout only — not every file.

```text
Bodhrik/
├── backend/
│   ├── app/                 # FastAPI app: models, routers, rbac, cache, queue
│   ├── alembic/             # Postgres migrations
│   ├── scripts/             # Demo seed (idempotent by email)
│   ├── tests/               # pytest (~34 tests)
│   ├── worker/              # Redis BRPOP summarisation consumer
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Shared UI
│   ├── lib/                 # API client, auth, discovery storage, taxonomy
│   ├── Dockerfile
│   └── package.json
├── scripts/
│   └── e2e-lifecycle.mjs    # Manual/API lifecycle smoke script
├── docs/                    # Assessment + architecture documentation
├── .github/workflows/ci.yml # Ruff, pytest, frontend lint + build
├── docker-compose.yml       # postgres, redis, api, worker, frontend
├── NOTES.md                 # Redirect → docs/WRITTEN_NOTE.md
└── README.md                # Quick start + doc index
```

| Area | One-liner |
|------|-----------|
| `backend/app` | REST API and domain logic |
| `backend/worker` | Async stub summarisation |
| `backend/tests` | Automated API/RBAC/Redis tests |
| `frontend` | Customer + provider UI |
| `docker-compose.yml` | Full local stack |
| `docs/` | Reviewer-facing design and setup notes |
