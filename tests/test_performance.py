"""
test_performance.py: result cache, light/heavy lanes and start-up warm-up (api/result_cache.py,
api/lanes.py, api/warmup.py). The sandbox is mocked; these check the plumbing, not the simulators.
"""

from __future__ import annotations

import asyncio
import os
from unittest.mock import patch

import httpx
import jwt
import pytest

os.environ.setdefault("JWT_SECRET", "test-secret-0123456789abcdef0123456789abcdef")
SECRET = os.environ["JWT_SECRET"]

from api import lanes, result_cache  # noqa: E402
from api.main import create_app  # noqa: E402
from api.models import exit_code_to_status  # noqa: E402
from api.sandbox import SandboxResult  # noqa: E402
from api.routes import simulate as sim_route  # noqa: E402

DESIGN = "module top(input a, output y); assign y = a; endmodule"
BENCH = "module tb; endmodule"


def _token() -> str:
    import time
    return jwt.encode({"iss": "test", "exp": int(time.time()) + 60}, SECRET, algorithm="HS256")


def _result(code: int = 0) -> SandboxResult:
    return SandboxResult(exit_code=code, status=exit_code_to_status(code), stdout="ok\n", stderr="",
                         duration_ms=5.0, workspace_id="w")


def _post_many(bodies, fake_run):
    async def go():
        transport = httpx.ASGITransport(app=create_app())
        async with httpx.AsyncClient(transport=transport, base_url="http://t",
                                     headers={"Authorization": f"Bearer {_token()}"}) as c:
            return [await c.post("/simulate", json=b) for b in bodies]
    with patch.object(sim_route, "run_simulation", fake_run):
        return asyncio.run(go())


class _Counter:
    """A stand-in for run_simulation that counts calls and returns a fixed exit code."""
    def __init__(self, code=0):
        self.calls, self.code = 0, code

    async def __call__(self, *a, **k):
        self.calls += 1
        return _result(self.code)


class TestResultCacheUnit:
    def test_least_recently_used_goes_first_and_bytes_are_bounded(self):
        c = result_cache.ResultCache(max_bytes=400)
        for i in range(3):
            assert c.put(f"k{i}", b"x" * 90)
        assert c.get("k0") is not None                 # touch k0: now k1 is the oldest
        assert c.put("k3", b"x" * 90) and c.put("k4", b"x" * 90)
        assert c.get("k1") is None and c.get("k0") is not None
        assert c._size <= 400

    def test_one_huge_reply_cannot_flush_the_cache(self):
        c = result_cache.ResultCache(max_bytes=1000)
        c.put("small", b"x" * 100)
        assert c.put("huge", b"x" * 600) is False      # over a quarter of the budget
        assert c.get("small") is not None

    def test_zero_budget_is_off(self):
        c = result_cache.ResultCache(max_bytes=0)
        assert c.enabled is False and c.put("k", b"x") is False and c.get("k") is None

    def test_key_depends_on_every_field(self):
        base = {"d": "a", "t": "b", "timeout": 30}
        k = result_cache.make_key("simulate", base)
        assert k == result_cache.make_key("simulate", dict(reversed(list(base.items()))))   # order-free
        assert k != result_cache.make_key("simulate", {**base, "timeout": 31})
        assert k != result_cache.make_key("formal", base)


class TestSimulateCache:
    BODY = {"design_v": DESIGN, "testbench_v": BENCH}

    def test_second_identical_run_is_answered_from_memory(self):
        run = _Counter()
        a, b = _post_many([self.BODY, self.BODY], run)
        assert (a.headers["x-cache"], b.headers["x-cache"]) == ("MISS", "HIT")
        assert run.calls == 1 and a.json() == b.json() and a.json()["status"] == "success"

    def test_different_code_or_timeout_is_a_different_entry(self):
        run = _Counter()
        _post_many([self.BODY, {**self.BODY, "timeout": 5}, {**self.BODY, "design_v": DESIGN + " "}], run)
        assert run.calls == 3

    def test_compile_errors_are_kept(self):
        run = _Counter(code=2)                          # 2 = compile error
        a, b = _post_many([self.BODY, self.BODY], run)
        assert a.json()["status"] == "compile_error" and b.headers["x-cache"] == "HIT" and run.calls == 1

    @pytest.mark.parametrize("code", [124, 3, 1])       # timeout, runtime error, other: depend on machine load
    def test_timeouts_and_runtime_errors_are_never_kept(self, code):
        run = _Counter(code=code)
        a, b = _post_many([self.BODY, self.BODY], run)
        assert a.json()["status"] != "success" and a.json()["status"] != "compile_error"
        assert b.headers["x-cache"] == "MISS" and run.calls == 2

    def test_python_testbenches_are_never_cached(self):
        run = _Counter()
        a, b = _post_many([{**self.BODY, "testbench_language": "python"}] * 2, run)
        assert a.headers["x-cache"] == b.headers["x-cache"] == "BYPASS" and run.calls == 2

    def test_cache_off_by_budget(self, monkeypatch):
        monkeypatch.setattr(result_cache.cache, "max_bytes", 0)
        run = _Counter()
        a, b = _post_many([self.BODY, self.BODY], run)
        assert a.headers["x-cache"] == b.headers["x-cache"] == "BYPASS" and run.calls == 2


class TestCachedCall:
    def test_only_definite_answers_are_stored_and_a_hit_skips_the_lane(self):
        async def go():
            n = 0

            async def compute():
                nonlocal n
                n += 1
                return {"ok": n > 1}                     # first call fails (not definite), later ones succeed

            lane = asyncio.Semaphore(1)
            call = lambda: result_cache.cached_call("t", {"x": 1}, lane, compute, lambda r: r["ok"])
            first, second, third = await call(), await call(), await call()
            await lane.acquire()                         # lane fully busy: a hit must not wait for it
            fourth = await asyncio.wait_for(call(), timeout=1)
            return [r.headers["x-cache"] for r in (first, second, third, fourth)], n
        states, n = asyncio.run(go())
        assert states == ["MISS", "MISS", "HIT", "HIT"] and n == 2


class TestLanes:
    def test_only_plain_verilog_on_icarus_is_light(self):
        assert lanes.lane_for_simulation("verilog", "verilog", "icarus") is lanes.light
        for args in (("verilog", "verilog", "verilator"), ("vhdl", "verilog", "icarus"), ("verilog", "python", "icarus")):
            assert lanes.lane_for_simulation(*args) is lanes.heavy

    def test_default_shares_one_pool(self):
        assert lanes.heavy is lanes.light                # MAX_HEAVY_SIMULATIONS defaults to 0

    def test_a_busy_heavy_lane_does_not_block_a_light_run(self, monkeypatch):
        async def go():
            heavy_lane = asyncio.Semaphore(1)
            monkeypatch.setattr(lanes, "heavy", heavy_lane)
            await heavy_lane.acquire()                   # a Verilator build is running
            transport = httpx.ASGITransport(app=create_app())
            async with httpx.AsyncClient(transport=transport, base_url="http://t",
                                         headers={"Authorization": f"Bearer {_token()}"}) as c:
                light_run = await asyncio.wait_for(c.post("/simulate", json={"design_v": DESIGN, "testbench_v": BENCH}), 5)
                blocked = asyncio.create_task(c.post("/simulate", json={"design_v": DESIGN, "testbench_v": BENCH,
                                                                          "simulator": "verilator"}))
                await asyncio.sleep(0.2)
                still_waiting = not blocked.done()
                heavy_lane.release()
                heavy_run = await asyncio.wait_for(blocked, 5)
            return light_run.status_code, still_waiting, heavy_run.status_code
        with patch.object(sim_route, "run_simulation", _Counter()):
            light_status, still_waiting, heavy_status = asyncio.run(go())
        assert light_status == 200 and still_waiting and heavy_status == 200


class TestWarmup:
    def test_finishes_and_runs_the_same_path_as_a_request(self):
        from api import warmup
        seen = []

        async def fake_exec(design, bench, timeout, lint=False, *a, **k):
            seen.append((timeout, lint))

        with patch.object(sim_route, "_execute_simulation", fake_exec), patch.object(warmup, "_read_tool", lambda cmd: None):
            assert asyncio.run(warmup.warm_up()) is True
        assert seen == [(10, True)]

    def test_never_raises_when_the_job_fails(self):
        from api import warmup

        async def boom(*a, **k):
            raise RuntimeError("tools missing")

        with patch.object(sim_route, "_execute_simulation", boom):
            assert asyncio.run(warmup.warm_up()) is False

    def test_gives_up_after_its_budget(self):
        from api import warmup

        async def slow(*a, **k):
            await asyncio.sleep(5)

        with patch.object(sim_route, "_execute_simulation", slow):
            assert asyncio.run(warmup.warm_up(budget_s=0.05)) is False

    def test_startup_launches_it_in_the_background_when_enabled(self, monkeypatch):
        from api import warmup
        from fastapi.testclient import TestClient
        ran = []

        async def fake_warm(*a, **k):
            ran.append(1)
            return True

        monkeypatch.setattr(warmup, "warm_up", fake_warm)
        with TestClient(create_app()) as c:              # `with` runs the lifespan
            assert c.get("/health").status_code == 200
        assert ran == [1]
