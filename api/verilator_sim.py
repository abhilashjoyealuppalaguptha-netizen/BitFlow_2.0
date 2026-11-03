"""
verilator_sim.py — the verification simulator: Verilator 5 with SystemVerilog assertions,
constrained random (randomize() via Z3) and coverage.

  run_verilator_sync(tmpdir, workspace_id, timeout) -> SandboxResult with .assertions and .coverage

Flow, all under sandbox._run_limited:
  1. verilator --binary --timing --assert --coverage --trace  design.v tb.v  (C++ build, -O0 to keep it quick)
  2. run the binary with a high error limit, so every failed assertion is reported and coverage is still written
  3. parse failed assertions from the output and coverage.dat into per-type percentages

Coverage is of the design only (design.v): the testbench's own lines don't count. Types:
line, branch, toggle (one point per signal bit) and user (`cover property` / `cover`).
"""

from __future__ import annotations

import os
import re
import subprocess
import time

from api.models import SandboxExitCode, exit_code_to_status
from api.sandbox import SandboxResult, _run_limited, first_compile_error

BUILD_TIMEOUT_SECONDS = 90
ERROR_LIMIT = 1000           # keep going after failed assertions so all are reported
MAX_ASSERTIONS = 50
DESIGN_FILES = ("design.v",)

# [15] %Error: design.v:7: Assertion failed in tb.dut: reset failed
_ASSERT = re.compile(r"^\[(?P<time>\d+)\]\s+%(?P<level>Error|Warning|Fatal)[^:]*:\s*(?P<file>[^:\s]+):(?P<line>\d+):\s*"
                     r"Assertion failed in (?P<scope>[^:]+?)(?::\s*(?P<msg>.*))?$")
_COV_LINE = re.compile(r"^C '(.*)' (\d+)$")
_COV_TYPES = {"v_line": "line", "v_branch": "branch", "v_toggle": "toggle", "v_user": "user"}


def parse_assertions(output: str) -> list[dict]:
    found = []
    for raw in output.splitlines():
        m = _ASSERT.match(raw.strip())
        if m:
            found.append({
                "time": int(m["time"]), "file": m["file"], "line": int(m["line"]),
                "scope": m["scope"].strip(), "message": (m["msg"] or "").strip(),
                "severity": "error" if m["level"] in ("Error", "Fatal") else "warning",
            })
            if len(found) >= MAX_ASSERTIONS:
                break
    return found


def parse_coverage(text: str, design_files: tuple[str, ...] = DESIGN_FILES) -> dict:
    """coverage.dat -> {summary: {type: {hit, total, percent}}, lines: {file: {line: hits}}, branches, toggles, covers}."""
    points: dict[str, list[tuple]] = {t: [] for t in _COV_TYPES.values()}
    lines: dict[str, dict[int, int]] = {}
    branches: list[dict] = []
    toggles: list[dict] = []
    covers: list[dict] = []
    seen = set()
    for raw in text.splitlines():
        m = _COV_LINE.match(raw.strip())
        if not m:
            continue
        kv = dict(p.split("\x02", 1) for p in m.group(1).split("\x01") if "\x02" in p)
        kind = _COV_TYPES.get(kv.get("page", "").split("/")[0])
        f = os.path.basename(kv.get("f", ""))
        if not kind or f not in design_files:
            continue
        line, count = int(kv.get("l", 0) or 0), int(m.group(2))
        key = (kind, f, line, kv.get("o", ""), kv.get("h", ""))   # the same point once per instance: merge
        if key in seen:
            continue
        seen.add(key)
        points[kind].append((f, line, count))
        if kind == "line":
            per_file = lines.setdefault(f, {})
            per_file[line] = min(per_file[line], count) if line in per_file else count
        elif kind == "branch":
            # Verilator puts both sides (if/else, each case item) on the line of the `if`/`case`.
            branches.append({"file": f, "line": line, "side": kv.get("o", ""), "hits": count})
        elif kind == "toggle":
            toggles.append({"signal": kv.get("o", ""), "file": f, "line": line, "hits": count})
        else:
            covers.append({"file": f, "line": line, "name": kv.get("o", "cover"), "hits": count})
    summary = {}
    for kind, pts in points.items():
        hit = sum(1 for _, _, c in pts if c > 0)
        summary[kind] = {"hit": hit, "total": len(pts), "percent": round(100 * hit / len(pts), 1) if pts else None}
    return {"summary": summary, "lines": lines, "branches": branches[:500], "toggles": toggles[:500], "covers": covers[:100]}


def _result(code: int, out: list[str], t0: float, workspace_id: str,
            assertions: list | None = None, coverage: dict | None = None) -> SandboxResult:
    return SandboxResult(
        exit_code=code, status=exit_code_to_status(code), stdout="\n".join(out), stderr="",
        duration_ms=round((time.monotonic() - t0) * 1000, 1), workspace_id=workspace_id,
        assertions=assertions or [], coverage=coverage,
    )


def run_verilator_sync(tmpdir: str, workspace_id: str, timeout: int) -> SandboxResult:
    t0 = time.monotonic()
    out = ["--- Building with Verilator (assertions, coverage, constrained random) ---"]
    try:
        rc, build = _run_limited(
            ["verilator", "--binary", "--timing", "--assert", "--coverage", "--trace",
             "-CFLAGS", "-O0", "-j", "2", "-Wno-fatal", "-Wno-lint", "-Wno-style",
             "--Mdir", "obj_dir", "-o", "sim", "design.v", "tb.v"],
            cwd=tmpdir, timeout=BUILD_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return _result(SandboxExitCode.INTERNAL_ERROR, out + [f"[ERROR] Build exceeded {BUILD_TIMEOUT_SECONDS}s."], t0, workspace_id)
    except FileNotFoundError:
        return _result(SandboxExitCode.INTERNAL_ERROR, out + ["[ERROR] Verilator is not installed on the server."], t0, workspace_id)

    build = "\n".join(l for l in build.replace(tmpdir + os.sep, "").splitlines()
                      if l.startswith("%") or "error" in l.lower())   # drop make/g++ chatter, keep diagnostics
    if build:
        out.append(build)
    if rc != 0 or not os.path.exists(os.path.join(tmpdir, "obj_dir", "sim")):
        cause = first_compile_error(build)
        out.append(f"[ERROR] Compilation failed: {cause}" if cause else "[ERROR] Compilation failed (Verilator).")
        return _result(SandboxExitCode.COMPILE_ERROR, out, t0, workspace_id)
    out.append("[OK] Build successful")

    out.append(f"\n--- Simulating (limit: {timeout}s) ---")
    try:
        sim_rc, sim_out = _run_limited([os.path.join("obj_dir", "sim"), f"+verilator+error+limit+{ERROR_LIMIT}"],
                                       cwd=tmpdir, timeout=timeout)
    except subprocess.TimeoutExpired:
        return _result(SandboxExitCode.TIMEOUT, out + [f"[ERROR] Simulation exceeded {timeout}s time limit and was killed."],
                       t0, workspace_id)
    sim_out = "\n".join(l for l in sim_out.splitlines() if not l.startswith(("- S i m u l a t i o n", "- Verilator:")))
    if sim_out.strip():
        out.append(sim_out.strip())
    assertions = parse_assertions(sim_out)
    if assertions:
        out.append(f"[FAIL] {len(assertions)} assertion failure(s); the first at time {assertions[0]['time']}, "
                   f"{assertions[0]['file']}:{assertions[0]['line']}")

    coverage = None
    cov_path = os.path.join(tmpdir, "coverage.dat")
    if os.path.exists(cov_path):
        with open(cov_path, encoding="latin-1") as f:
            coverage = parse_coverage(f.read())
        out.append("[OK] Coverage: " + ", ".join(
            f"{k} {v['percent']}% ({v['hit']}/{v['total']})" for k, v in coverage["summary"].items() if v["total"]))

    # A testbench may $dumpfile("anything.vcd"): keep the newest as wave.vcd, like the Icarus flow.
    if not os.path.exists(os.path.join(tmpdir, "wave.vcd")):
        dumps = [os.path.join(tmpdir, f) for f in os.listdir(tmpdir) if f.endswith(".vcd")]
        if dumps:
            os.replace(max(dumps, key=os.path.getmtime), os.path.join(tmpdir, "wave.vcd"))

    if sim_rc != 0:
        out.append(f"[ERROR] Simulation runtime error (exit code {sim_rc}).")
        code = SandboxExitCode.RUNTIME_ERROR
    else:
        out.append("[OK] Simulation finished successfully.")
        code = 0
    return _result(code, out, t0, workspace_id, assertions=assertions, coverage=coverage)
