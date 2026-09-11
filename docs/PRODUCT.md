# Product

Ledger is a small service marketplace: discover providers, request appointments against real weekly availability, and review completed visits. No payments.

## Customer

- Discover home, categories, explore (search/filter/sort)
- Compare (up to 3), save, recently viewed (browser storage)
- Open provider → choose service → pick slot → request booking
- Manage bookings (tabs: upcoming / pending / past / cancelled)
- Write review after `completed`; rebook from provider profile

## Provider

- Dashboard home, bookings list/detail
- Services CRUD and weekly availability
- Confirm or decline (`cancelled`) pending requests
- Mark confirmed visits `completed` or `no_show`
- View reviews; trigger summarisation job (stub)
- Profile page is **display + ops** (services/hours); there is no provider profile PATCH API

## Booking lifecycle

```text
Request → pending → confirmed → completed
                 ↘ cancelled
         confirmed → cancelled | no_show | completed
```

Customer may cancel while **pending**. After **confirmed**, cancel is provider-owned (UI points customers to the provider).

## Intentional non-features

These are deliberate boundaries, not missing UI:

- No payments or deposits
- No in-app messaging or push notifications
- No separate `declined` status (decline = `cancelled`)
- No customer cancel/reschedule of **confirmed** bookings via API
- No provider profile edit API (fields set at register/seed)
- Summarisation is a **stub** job, not a real LLM
