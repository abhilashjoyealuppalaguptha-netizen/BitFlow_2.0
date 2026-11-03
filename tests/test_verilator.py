"""
tests/test_verilator.py — the verification simulator (api/verilator_sim.py): assertions,
coverage and constrained random through POST /simulate with simulator="verilator".

Parsing tests always run; the end-to-end tests need verilator + make (Dockerfile.api, CI).
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import time

import jwt
import pytest
from fastapi.testclient import TestClient

TEST_JWT_SECRET = "test-secret-0123456789abcdef0123456789abcdef"
os.environ["JWT_SECRET"] = TEST_JWT_SECRET

from api.main import create_app  # noqa: E402
from api.verilator_sim import parse_assertions, parse_coverage  # noqa: E402


def _verilator_version() -> tuple[int, int]:
    try:
        out = subprocess.run(["verilator", "--version"], capture_output=True, text=True, timeout=10).stdout
        m = re.search(r"Verilator (\d+)\.(\d+)", out)
        return (int(m[1]), int(m[2])) if m else (0, 0)
    except (OSError, subprocess.TimeoutExpired):
        return (0, 0)


needs_verilator = pytest.mark.skipif(not (shutil.which("verilator") and shutil.which("make")),
                                     reason="verilator/make not installed")
# randomize() with constraints needs Verilator 5.022+ (and Z3).
needs_randomize = pytest.mark.skipif(_verilator_version() < (5, 22) or not shutil.which("z3"),
                                     reason="Verilator 5.022+ with z3 needed for constrained random")

SEP1, SEP2 = "\x01", "\x02"


def _point(page: str, f: str, line: int, obj: str, count: int) -> str:
    return f"C '{SEP1}f{SEP2}{f}{SEP1}l{SEP2}{line}{SEP1}page{SEP2}{page}{SEP1}o{SEP2}{obj}{SEP1}h{SEP2}tb.dut' {count}"


class TestParsing:
    def test_assertion_lines(self):
        out = "\n".join([
            "[15] %Error: design.v:7: Assertion failed in tb.dut: reset failed",
            "[40] %Warning: tb.v:12: Assertion failed in tb",
            "- Verilator: $finish at 415ps",
        ])
        a = parse_assertions(out)
        assert [(x["time"], x["file"], x["line"], x["severity"]) for x in a] == [
            (15, "design.v", 7, "error"), (40, "tb.v", 12, "warning")]
        assert a[0]["scope"] == "tb.dut" and a[0]["message"] == "reset failed"

    def test_coverage_summary_ignores_the_testbench(self):
        dat = "\n".join([
            "# SystemC::Coverage-3",
            _point("v_line/m", "design.v", 2, "block", 5),
            _point("v_branch/m", "design.v", 3, "if", 4),
            _point("v_branch/m", "design.v", 4, "else", 0),
            _point("v_toggle/m", "design.v", 1, "a", 3),
            _point("v_toggle/m", "design.v", 1, "y", 0),
            _point("v_user/m", "design.v", 9, "cover", 1),
            _point("v_line/tb", "tb.v", 5, "block", 0),        # testbench: not counted
        ])
        c = parse_coverage(dat)
        s = c["summary"]
        assert s["branch"] == {"hit": 1, "total": 2, "percent": 50.0}
        assert s["toggle"] == {"hit": 1, "total": 2, "percent": 50.0}
        assert s["line"] == {"hit": 1, "total": 1, "percent": 100.0}
        assert s["user"]["percent"] == 100.0
        assert c["lines"]["design.v"] == {2: 5}
        assert [(b["line"], b["side"], b["hits"]) for b in c["branches"]] == [(3, "if", 4), (4, "else", 0)]
        assert "tb.v" not in c["lines"]

    def test_duplicate_instances_count_once(self):
        dat = "\n".join([_point("v_line/m", "design.v", 2, "block", 3)] * 2)
        assert parse_coverage(dat)["summary"]["line"]["total"] == 1


# ── End to end through POST /simulate ─────────────────────────────────────────

MUX = """\
module mux(input logic sel, input logic a, output logic y);
  always_comb begin
    if (sel) y = a;
    else y = ~a;
  end
endmodule
"""

ONE_SIDED_TB = """\
`timescale 1ns/1ns
module tb;
  logic sel = 1, a = 0, y;
  mux dut(.*);
  initial begin
    #5 a = 1;
    #5 assert (y == 0) else $error("y should be 0");
    #5 $finish;
  end
endmodule
"""

RANDOM_TB = """\
`timescale 1ns/1ns
class Stim; rand bit sel; rand bit a; constraint c { sel dist {1 := 1, 0 := 1}; } endclass
module tb;
  logic sel, a, y;
  mux dut(.*);
  initial begin
    Stim s = new;
    repeat (40) begin
      if (!s.randomize()) $fatal(1, "randomize failed");
      sel = s.sel; a = s.a; #1;
      assert (y == (sel ? a : ~a)) else $error("mismatch");
    end
    $finish;
  end
endmodule
"""


@pytest.fixture(scope="module")
def client() -> TestClient:
    token = jwt.encode({"iss": "test", "exp": int(time.time()) + 300}, TEST_JWT_SECRET, algorithm="HS256")
    return TestClient(create_app(), raise_server_exceptions=False, headers={"Authorization": f"Bearer {token}"})


def _sim(client, tb: str, design: str = MUX) -> dict:
    r = client.post("/simulate", json={"design_v": design, "testbench_v": tb, "simulator": "verilator", "timeout": 20})
    assert r.status_code == 200, r.text
    return r.json()


@needs_verilator
class TestVerilatorFlow:
    def test_assertion_failure_is_reported_with_its_time(self, client):
        d = _sim(client, ONE_SIDED_TB)
        assert d["status"] == "success", d["stdout"]
        assert [(a["time"], a["file"], a["line"]) for a in d["assertions"]] == [(10, "tb.v", 7)]
        assert "[FAIL] 1 assertion failure" in d["stdout"]

    def test_branch_coverage_counts_the_untested_side(self, client):
        cov = _sim(client, ONE_SIDED_TB)["coverage"]
        assert cov["summary"]["branch"]["percent"] == 50.0
        sides = {b["side"]: b["hits"] for b in cov["branches"]}
        assert sides.get("else") == 0, f"the else branch never ran: {sides}"
        assert sides.get("if", 0) > 0

    @needs_randomize
    def test_constrained_random_reaches_full_branch_coverage(self, client):
        d = _sim(client, RANDOM_TB)
        assert d["status"] == "success" and d["assertions"] == [], d["stdout"]
        assert d["coverage"]["summary"]["branch"]["percent"] == 100.0

    def test_compile_errors_are_compile_errors(self, client):
        d = _sim(client, ONE_SIDED_TB, design="module mux(; endmodule\n")
        assert d["status"] == "compile_error"

    def test_icarus_stays_the_default(self, client):
        r = client.post("/simulate", json={"design_v": MUX, "testbench_v": ONE_SIDED_TB.replace("assert (y == 0) else $error(\"y should be 0\");", "")})
        d = r.json()
        assert d["coverage"] is None and d["assertions"] == []
