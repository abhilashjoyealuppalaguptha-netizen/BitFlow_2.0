"""
result_cache.py: answer identical requests from memory.

Simulation, synthesis and formal results are deterministic functions of the request (Icarus and
Verilator use fixed seeds; Yosys, nextpnr and the SAT solvers are seeded), so a student re-running
the same code, or everyone submitting the starter code, needn't recompute it. Only definite answers
are stored: never a timeout or an infrastructure error, which depend on machine load.

An in-memory LRU bounded by bytes (RESULT_CACHE_MB; 0 disables it). Cached bytes are the exact JSON
body of the original reply, so a hit costs a dict lookup, not a re-serialisation of a large waveform.
"""

from __future__ import annotations

import hashlib
import json
import logging
from collections import OrderedDict
from typing import Any, Awaitable, Callable

from fastapi import Response

from api.config import settings

logger = logging.getLogger(__name__)


class ResultCache:
    def __init__(self, max_bytes: int) -> None:
        self.max_bytes = max_bytes
        self._items: "OrderedDict[str, bytes]" = OrderedDict()
        self._size = 0
        self.hits = 0
        self.misses = 0

    @property
    def enabled(self) -> bool:
        return self.max_bytes > 0

    def get(self, key: str) -> bytes | None:
        payload = self._items.get(key)
        if payload is None:
            self.misses += 1
            return None
        self._items.move_to_end(key)
        self.hits += 1
        return payload

    def put(self, key: str, payload: bytes) -> bool:
        # One reply must not be able to flush the whole cache.
        if not self.enabled or len(payload) > self.max_bytes // 4:
            return False
        old = self._items.pop(key, None)
        if old is not None:
            self._size -= len(old)
        self._items[key] = payload
        self._size += len(payload)
        while self._size > self.max_bytes and self._items:
            _, evicted = self._items.popitem(last=False)
            self._size -= len(evicted)
        return True

    def stats(self) -> dict[str, int]:
        return {"entries": len(self._items), "bytes": self._size, "max_bytes": self.max_bytes,
                "hits": self.hits, "misses": self.misses}


cache = ResultCache(settings.result_cache_mb * 1024 * 1024)


def make_key(kind: str, material: dict[str, Any]) -> str:
    blob = json.dumps({"k": kind, "m": material}, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def _json_response(payload: bytes, state: str) -> Response:
    return Response(content=payload, media_type="application/json", headers={"X-Cache": state})


def lookup(kind: str, material: dict[str, Any], use_cache: bool = True) -> tuple[str | None, Response | None]:
    """(cache key, ready reply on a hit). The key is None when caching is off for this request."""
    if not use_cache or not cache.enabled:
        return None, None
    key = make_key(kind, material)
    hit = cache.get(key)
    return key, (_json_response(hit, "HIT") if hit is not None else None)


def finish(result: Any, key: str | None, definite: bool) -> Response:
    """JSON reply for `result` (dict or pydantic model); kept for next time when `definite`."""
    payload = (result.model_dump_json() if hasattr(result, "model_dump_json")
               else json.dumps(result, separators=(",", ":"))).encode("utf-8")
    if key is not None and definite:
        cache.put(key, payload)
    return _json_response(payload, "MISS" if key is not None else "BYPASS")


async def cached_call(
    kind: str,
    material: dict[str, Any],
    lane,
    compute: Callable[[], Awaitable[Any]],
    store_if: Callable[[Any], bool],
    use_cache: bool = True,
) -> Response:
    """
    Answer from the cache, or wait for `lane`, run `compute()` and keep the reply when
    `store_if(result)` says it is a definite answer. A hit never waits for a lane slot.
    """
    key, hit = lookup(kind, material, use_cache)
    if hit is not None:
        return hit
    async with lane:
        result = await compute()
    return finish(result, key, store_if(result))
