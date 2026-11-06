"""Shared test setup."""

import pytest


@pytest.fixture(autouse=True)
def _fresh_result_cache():
    """The result cache is process-wide: without this, a reply stored by one test (often from a mocked
    sandbox) would answer the next test's identical request."""
    from api import result_cache
    result_cache.cache._items.clear()
    result_cache.cache._size = 0
    result_cache.cache.hits = result_cache.cache.misses = 0
    yield
