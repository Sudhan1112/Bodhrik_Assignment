# Ledger design notes

## Schema shape

Ledger keeps a single `users` table for admin, provider, and customer. Provider-only fields (`business_name`, `bio`, media URLs, city, category, `review_summary`) stay nullable while the provider surface is still modest; split into `provider_profiles` when hours, galleries, verification, or org membership grow. Services and weekly `availability_rules` are first-class tables so bookings no longer invent free-form duration and price. Bookings store `service_id` plus denormalised `service_name` for history if a service is later renamed or deactivated. Reviews remain one-per-booking with rating constraints in the database; `provider_reply` is optional and single-shot. `provider_id` on reviews stays denormalised for fast public reads. Overlap prevention is application-level today (query active bookings); a exclusion constraint would be the next hardening step.

## RBAC evolution

Access is still two layers: `require_role` on routes, then centralized row checks and an owned status machine. Adding a fourth role means extending the enum, gates, ownership helper, and transition role table in the same places. Nested orgs would replace `user.id == booking.provider_id` with membership resolution so an org-admin inherits provider powers across members. Availability and services already scope by `provider_id`; org scope would add `org_id` filters the same way.

## Product and production gaps

We left the sparse “ledger row” aesthetic for a photography-led marketplace because the product is judged as a booking destination, not an accounting sheet. Still missing for production: expand/contract migrations only against Postgres (tests use SQLite create_all), secrets out of compose defaults, closed admin signup, httpOnly cookies instead of JWT in `localStorage`, token revocation, timezone-aware calendars, payments/deposits, real LLM summarisation with job status and DLQ, rate limits, observability, and pagination on heavy lists beyond the provider directory. Customer cancel after confirm remains intentional MVP (UI points them to the provider). Seed data (`python -m scripts.seed`) fills demo providers so the UI never looks empty after compose up.
