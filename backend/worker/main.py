"""Long-running worker: BRPOP summarise jobs and stub-fill review summaries."""

from __future__ import annotations

import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.cache import get_redis  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.models import Review, User  # noqa: E402
from app.queue import parse_job  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("ledger.worker")


def stub_summary(review: Review) -> str:
    if review.comment:
        text = review.comment.strip()
        if len(text) > 120:
            return text[:117] + "..."
        return text
    return f"Rated {review.rating}/5"


def provider_level_summary(reviews: list[Review]) -> str | None:
    if not reviews:
        return None
    avg = sum(r.rating for r in reviews) / len(reviews)
    snippets = [stub_summary(r) for r in reviews[:3]]
    joined = "; ".join(snippets)
    return (
        f"Guests rate this provider {avg:.1f}/5 across {len(reviews)} visits. "
        f"Highlights: {joined}"
    )


def process_job(provider_id: UUID) -> int:
    db = SessionLocal()
    try:
        reviews = db.query(Review).filter(Review.provider_id == provider_id).all()
        now = datetime.now(timezone.utc)
        for review in reviews:
            review.summary = stub_summary(review)
            review.summarised_at = now
        provider = db.get(User, provider_id)
        if provider is not None:
            provider.review_summary = provider_level_summary(reviews)
        db.commit()
        return len(reviews)
    finally:
        db.close()


def run_forever() -> None:
    settings = get_settings()
    client = get_redis()
    logger.info("Worker started; waiting on %s", settings.summarise_queue_key)
    while True:
        try:
            item = client.brpop(settings.summarise_queue_key, timeout=5)
            if item is None:
                continue
            _key, raw = item
            job = parse_job(raw)
            provider_id = UUID(job["provider_id"])
            job_id = job.get("job_id")
            count = process_job(provider_id)
            logger.info("Job %s: summarised %s reviews for provider %s", job_id, count, provider_id)
        except Exception:
            logger.exception("Worker error; sleeping briefly")
            time.sleep(1)


if __name__ == "__main__":
    run_forever()
