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

BUILD_TIMEOUT_SECONDS = 150   # Render's free instance needs ~45 s; a 4-vCPU server ~5 s
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


# Two steps, the same for live runs and for the runtime prebuilt into the image:
#   1. verilator generates C++ (GENERATE)   2. make compiles it (MAKE)
# Between them the prebuilt runtime objects are copied in. Verilator's makefile makes them depend
# on the generated Vsim.mk, so they must be copied after step 1 to count as up to date.
GENERATE = ["verilator", "--cc", "--exe", "--main", "--timing", "--assert", "--coverage", "--trace",
            "-CFLAGS", "-O0", "-Wno-fatal", "-Wno-lint", "-Wno-style",
            "--prefix", "Vsim", "--Mdir", "obj_dir", "-o", "sim"]
# VM_PARALLEL_BUILDS=0: compile the model as one Vsim__ALL.cpp. Newer Verilator (5.032 in the
# image) otherwise splits it and precompiles Vsim__pch.h into .gch files far over the sandbox's
# 32 MB file-size limit, so cc1plus is killed ("File size limit exceeded"). One file is also
# faster for student-sized designs.
MAKE = ["make", "-C", "obj_dir", "-f", "Vsim.mk", "-j", "2", "VM_PARALLEL_BUILDS=0"]
RUNTIME_DIR = "/opt/verilator-runtime"   # verilated*.o, built once by Dockerfile.api


def prebuild_runtime(dest: str = RUNTIME_DIR) -> None:
    """Build Verilator's runtime library (the same for every design) once, at image build time,
    so each run only compiles the student's model."""
    import shutil
    import tempfile
    work = tempfile.mkdtemp()
    with open(os.path.join(work, "design.v"), "w") as f:
        f.write("module m(input logic a, output logic y); assign y = a; endmodule\n")
    with open(os.path.join(work, "tb.v"), "w") as f:
        f.write("module tb; logic a = 0, y; m dut(.*); initial begin #1 a = 1; #1 $finish; end endmodule\n")
    subprocess.run([*GENERATE, "design.v", "tb.v"], cwd=work, check=True, capture_output=True)
    subprocess.run(MAKE, cwd=work, check=True, capture_output=True)
    os.makedirs(dest, exist_ok=True)
    for name in os.listdir(os.path.join(work, "obj_dir")):
        if name.startswith("verilated") and name.endswith(".o"):
            shutil.copy2(os.path.join(work, "obj_dir", name), dest)
    shutil.rmtree(work, ignore_errors=True)


def _seed_runtime(tmpdir: str) -> None:
    """Copy the prebuilt runtime objects into obj_dir (after GENERATE): make then skips them."""
    obj = os.path.join(tmpdir, "obj_dir")
    if not (os.path.isdir(RUNTIME_DIR) and os.path.isdir(obj)):
        return
    import shutil
    owner = os.stat(obj)
    for name in os.listdir(RUNTIME_DIR):
        path = os.path.join(obj, name)
        shutil.copyfile(os.path.join(RUNTIME_DIR, name), path)   # fresh mtime: newer than Vsim.mk
        if os.name == "posix" and os.geteuid() == 0:   # the sandbox user owns the build
            os.chown(path, owner.st_uid, owner.st_gid)


def _clean(text: str, tmpdir: str) -> str:
    """Keep diagnostics, drop make/g++ chatter; workspace-relative paths."""
    return "\n".join(l for l in text.replace(tmpdir + os.sep, "").splitlines()
                     if l.startswith("%") or "error" in l.lower())


def run_verilator_sync(tmpdir: str, workspace_id: str, timeout: int) -> SandboxResult:
    t0 = time.monotonic()
    out = ["--- Building with Verilator (assertions, coverage, constrained random) ---"]
    build = ""
    try:
        rc, gen = _run_limited([*GENERATE, "design.v", "tb.v"], cwd=tmpdir, timeout=BUILD_TIMEOUT_SECONDS)
        build = _clean(gen, tmpdir)
        if rc == 0:
            _seed_runtime(tmpdir)
            rc, made = _run_limited(MAKE, cwd=tmpdir, timeout=BUILD_TIMEOUT_SECONDS)
            build = "\n".join(x for x in (build, _clean(made, tmpdir)) if x)
    except subprocess.TimeoutExpired:
        return _result(SandboxExitCode.INTERNAL_ERROR, out + [f"[ERROR] Build exceeded {BUILD_TIMEOUT_SECONDS}s."], t0, workspace_id)
    except FileNotFoundError:
        return _result(SandboxExitCode.INTERNAL_ERROR, out + ["[ERROR] Verilator is not installed on the server."], t0, workspace_id)

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
