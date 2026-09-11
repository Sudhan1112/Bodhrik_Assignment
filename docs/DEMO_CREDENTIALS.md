# Demo credentials

Seeded by `backend/scripts/seed.py` (also on `docker compose up` when `SEED=1`).

**Password for every demo account:** `password123`

These are intentional assessment/demo accounts only — not production secrets.

## Primary accounts

| Email | Role | Use for |
|-------|------|---------|
| `guest@ledger.demo` | customer | Book, review, explore as shopper |
| `maya@ledger.demo` | provider (salon, Austin) | Happy-path provider console |

## Other seeded providers

All use `password123`. Useful for compare / multi-provider demos.

### Austin · salon

| Email | Business |
|-------|----------|
| `maya@ledger.demo` | Atelier Maya |
| `lena@ledger.demo` | South Congress Cuts |
| `priya@ledger.demo` | East Side Colour Lab |
| `diego@ledger.demo` | Mueller Modern Cuts |
| `aisha@ledger.demo` | Clarksville Curl Studio |
| `theo@ledger.demo` | Rainey Street Barbers |

### Houston · salon

| Email | Business |
|-------|----------|
| `james@ledger.demo` | Barber James |
| `carmen@ledger.demo` | Montrose Hair Co. |
| `marcus@ledger.demo` | Heights Edge Barbers |
| `hana@ledger.demo` | Rice Village Colour House |

### Austin · clinic

| Email | Business |
|-------|----------|
| `noah@ledger.demo` | Riverbend Wellness |
| `amelia@ledger.demo` | Zilker Family Practice |
| `raj@ledger.demo` | Domain Sports Medicine |
| `elena@ledger.demo` | Barton Creek Internal Med |
| `owen@ledger.demo` | South Austin Urgent Care |

### Dallas · consulting

| Email | Business |
|-------|----------|
| `sofia@ledger.demo` | Northline Advisory |
| `ben@ledger.demo` | Uptown Product Studio |
| `nina@ledger.demo` | Deep Ellum Finance Ops |
| `chris@ledger.demo` | Oak Lawn Growth Lab |
| `mira@ledger.demo` | Victory Park Leadership Co. |

## Admin

No seeded admin demo user. The `admin` **role** exists in the schema and RBAC (booking access bypass, summarise, etc.) but is not created by seed. Do not invent admin credentials.
