from __future__ import annotations

import json
from typing import Any, Protocol

import redis

from app.config import get_settings

STATUS_VARIANTS = ("all", "pending", "confirmed", "completed", "cancelled", "no_show")


class RedisLike(Protocol):
    def get(self, name: str) -> Any: ...
    def set(self, name: str, value: Any, ex: int | None = None) -> Any: ...
    def delete(self, *names: str) -> Any: ...
    def rpush(self, name: str, *values: Any) -> Any: ...
    def brpop(self, keys: Any, timeout: int = 0) -> Any: ...
    def llen(self, name: str) -> int: ...


class FakeRedis:
    """In-memory Redis stand-in for tests. No KEYS/SCAN."""

    def __init__(self) -> None:
        self._store: dict[str, str] = {}
        self._lists: dict[str, list[str]] = {}

    def get(self, name: str) -> str | None:
        return self._store.get(name)

    def set(self, name: str, value: Any, ex: int | None = None) -> bool:
        self._store[name] = value if isinstance(value, str) else str(value)
        return True

    def delete(self, *names: str) -> int:
        deleted = 0
        for name in names:
            if name in self._store:
                del self._store[name]
                deleted += 1
            if name in self._lists:
                del self._lists[name]
                deleted += 1
        return deleted

    def rpush(self, name: str, *values: Any) -> int:
        lst = self._lists.setdefault(name, [])
        for v in values:
            lst.append(v if isinstance(v, str) else str(v))
        return len(lst)

    def brpop(self, keys: Any, timeout: int = 0) -> tuple[str, str] | None:
        key_list = [keys] if isinstance(keys, str) else list(keys)
        for key in key_list:
            lst = self._lists.get(key)
            if lst:
                return key, lst.pop(0)
        return None

    def llen(self, name: str) -> int:
        return len(self._lists.get(name, []))


_client: RedisLike | None = None


def get_redis() -> RedisLike:
    global _client
    if _client is None:
        settings = get_settings()
        if settings.env == "test":
            _client = FakeRedis()
        else:
            _client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
    return _client


def set_redis_client(client: RedisLike | None) -> None:
    """Override Redis client (tests). Pass None to reset."""
    global _client
    _client = client


def bookings_list_key(user_id: str, role: str, status: str) -> str:
    return f"bookings:list:{user_id}:{role}:{status}"


def invalidate_bookings_cache(customer_id: Any, provider_id: Any) -> None:
    """Delete the known enumerable set of 12 keys. Never KEYS/SCAN."""
    client = get_redis()
    keys: list[str] = []
    for uid, role in ((str(customer_id), "customer"), (str(provider_id), "provider")):
        for status in STATUS_VARIANTS:
            keys.append(bookings_list_key(uid, role, status))
    if keys:
        client.delete(*keys)


def cache_get_json(key: str) -> Any | None:
    raw = get_redis().get(key)
    if raw is None:
        return None
    return json.loads(raw)


def cache_set_json(key: str, value: Any, ttl: int) -> None:
    get_redis().set(key, json.dumps(value, default=str), ex=ttl)
