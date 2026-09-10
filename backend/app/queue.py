import json
import uuid
from typing import Any

from app.cache import get_redis
from app.config import get_settings


def enqueue_summarise_job(provider_id: uuid.UUID) -> uuid.UUID:
    job_id = uuid.uuid4()
    payload = json.dumps({"job_id": str(job_id), "provider_id": str(provider_id)})
    settings = get_settings()
    get_redis().rpush(settings.summarise_queue_key, payload)
    return job_id


def parse_job(raw: str) -> dict[str, Any]:
    return json.loads(raw)
