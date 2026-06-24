"""
sandbox.py — Native subprocess simulation engine
=================================================

Runs Verilog simulations natively using iverilog/vvp installed in the
container, instead of launching a Docker-in-Docker child container.

This approach is compatible with PaaS platforms like Railway where the
Docker daemon is not available inside the running container.

Public surface:
    run_simulation(tmpdir, workspace_id, timeout) -> SandboxResult
    inspect_image(image_name) -> ImageInfo | None
    docker_is_available() -> bool
"""

from __future__ import annotations

import asyncio
import logging
import os
import subprocess
import time
from dataclasses import dataclass
from typing import Optional

from api.models import SandboxExitCode, exit_code_to_status

logger = logging.getLogger(__name__)


# =============================================================================
# Data classes (internal — not exposed to HTTP layer)
# =============================================================================

@dataclass
class SandboxResult:
    """
    Everything the route handler needs to know after a simulation run.
    This is an internal dataclass, not a Pydantic model — conversion to
    SimulateResponse happens in the route handler.
    """
    exit_code:    int
    status:       str
    stdout:       str
    stderr:       str
    duration_ms:  float
    workspace_id: str


@dataclass
class ImageInfo:
    """Stub kept for API compatibility with health/status routes."""
    image_id:    str
    size_bytes:  int
    size_mb:     float


# =============================================================================
# Public helpers
# =============================================================================

def docker_is_available() -> bool:
    """
    Always returns False — simulations run natively (no Docker daemon needed).
    Kept for API compatibility with health/status routes.
    """
    return False


def inspect_image(image_name: str) -> Optional[ImageInfo]:
    """
    Always returns None — no Docker image management in native mode.
    Kept for API compatibility with the /status route.
    """
    return None


# =============================================================================
# Core: synchronous simulation runner (called from thread pool)
# =============================================================================

def _run_simulation_sync(
    tmpdir: str,
    workspace_id: str,
    timeout: int,
) -> SandboxResult:
    """
    Runs iverilog compilation and vvp simulation directly as subprocesses.

    Flow:
      1. Compile design.v + tb.v with iverilog
      2. Simulate the compiled binary with vvp under a timeout
      3. Return stdout/stderr and a structured exit code

    Args:
        tmpdir       : Directory containing design.v and tb.v
        workspace_id : Short ID used for log correlation
        timeout      : Simulation wall-clock limit in seconds
    """
    t_start = time.monotonic()
    logger.info("ws=%s | Starting native simulation timeout=%ds", workspace_id, timeout)

    design_file    = os.path.join(tmpdir, "design.v")
    testbench_file = os.path.join(tmpdir, "tb.v")
    output_bin     = os.path.join(tmpdir, "a.out")
    vcd_file       = os.path.join(tmpdir, "wave.vcd")

    combined_stdout = []
    combined_stderr = []
    exit_code = SandboxExitCode.INTERNAL_ERROR

    # ── Step 1: validate source files ─────────────────────────────────────────
    for fpath in (design_file, testbench_file):
        if not os.path.exists(fpath):
            msg = f"[ERROR] Required source file not found: {fpath}"
            logger.error("ws=%s | %s", workspace_id, msg)
            combined_stderr.append(msg)
            duration_ms = (time.monotonic() - t_start) * 1000
            return SandboxResult(
                exit_code    = SandboxExitCode.INTERNAL_ERROR,
                status       = exit_code_to_status(SandboxExitCode.INTERNAL_ERROR),
                stdout       = "",
                stderr       = "\n".join(combined_stderr),
                duration_ms  = round(duration_ms, 1),
                workspace_id = workspace_id,
            )

    # ── Step 2: compile with iverilog ─────────────────────────────────────────
    combined_stdout.append("--- Compiling ---")
    try:
        compile_proc = subprocess.run(
            ["iverilog", "-o", output_bin, "-Wall", design_file, testbench_file],
            capture_output=True,
            text=True,
            timeout=30,
        )
        # iverilog prints warnings/errors to stderr, info to stdout
        if compile_proc.stdout:
            combined_stdout.append(compile_proc.stdout)
        if compile_proc.stderr:
            combined_stdout.append(compile_proc.stderr)   # show warnings inline

        if compile_proc.returncode != 0:
            combined_stdout.append("[ERROR] Compilation failed (iverilog exited with error).")
            logger.warning("ws=%s | Compilation failed", workspace_id)
            exit_code = SandboxExitCode.COMPILE_ERROR
            duration_ms = (time.monotonic() - t_start) * 1000
            return SandboxResult(
                exit_code    = exit_code,
                status       = exit_code_to_status(exit_code),
                stdout       = "\n".join(combined_stdout),
                stderr       = "\n".join(combined_stderr),
                duration_ms  = round(duration_ms, 1),
                workspace_id = workspace_id,
            )

        combined_stdout.append("[OK] Compilation successful → a.out")

    except subprocess.TimeoutExpired:
        combined_stderr.append("[ERROR] Compilation exceeded time limit.")
        exit_code = SandboxExitCode.INTERNAL_ERROR
        duration_ms = (time.monotonic() - t_start) * 1000
        return SandboxResult(
            exit_code    = exit_code,
            status       = exit_code_to_status(exit_code),
            stdout       = "\n".join(combined_stdout),
            stderr       = "\n".join(combined_stderr),
            duration_ms  = round(duration_ms, 1),
            workspace_id = workspace_id,
        )
    except FileNotFoundError:
        msg = "[ERROR] iverilog not found. Ensure iverilog is installed in the container."
        combined_stderr.append(msg)
        logger.error("ws=%s | %s", workspace_id, msg)
        exit_code = SandboxExitCode.INTERNAL_ERROR
        duration_ms = (time.monotonic() - t_start) * 1000
        return SandboxResult(
            exit_code    = exit_code,
            status       = exit_code_to_status(exit_code),
            stdout       = "\n".join(combined_stdout),
            stderr       = "\n".join(combined_stderr),
            duration_ms  = round(duration_ms, 1),
            workspace_id = workspace_id,
        )

    # ── Step 3: simulate with vvp ─────────────────────────────────────────────
    combined_stdout.append(f"\n--- Simulating (limit: {timeout}s) ---")
    try:
        sim_env = os.environ.copy()
        sim_env["VCD_FILE"]    = vcd_file
        sim_env["IVERILOG_DUMPER"] = "lxt"   # optional: may help some testbenches

        sim_proc = subprocess.run(
            ["vvp", output_bin],
            capture_output=True,
            text=True,
            timeout=timeout,
            env=sim_env,
            cwd=tmpdir,
        )
        if sim_proc.stdout:
            combined_stdout.append(sim_proc.stdout)
        if sim_proc.stderr:
            combined_stdout.append(sim_proc.stderr)

        if sim_proc.returncode != 0:
            combined_stdout.append(
                f"[ERROR] Simulation runtime error (vvp exit code: {sim_proc.returncode})."
            )
            exit_code = SandboxExitCode.RUNTIME_ERROR
        else:
            combined_stdout.append("[OK] Simulation finished successfully.")
            exit_code = 0  # success

        # Report VCD
        if os.path.exists(vcd_file):
            vcd_size = os.path.getsize(vcd_file)
            combined_stdout.append(f"[OK] Waveform written → wave.vcd ({vcd_size} bytes)")
        else:
            combined_stdout.append(
                "[WARN] No VCD file produced. Check that your testbench calls $dumpfile/$dumpvars."
            )

    except subprocess.TimeoutExpired:
        combined_stderr.append(
            f"[ERROR] Simulation exceeded {timeout}s time limit and was killed."
        )
        logger.warning("ws=%s | Simulation timed out", workspace_id)
        exit_code = SandboxExitCode.TIMEOUT

    except FileNotFoundError:
        msg = "[ERROR] vvp not found. Ensure iverilog is installed in the container."
        combined_stderr.append(msg)
        logger.error("ws=%s | %s", workspace_id, msg)
        exit_code = SandboxExitCode.INTERNAL_ERROR

    duration_ms = (time.monotonic() - t_start) * 1000
    status = exit_code_to_status(exit_code)

    logger.info(
        "ws=%s | Finished status=%s exit_code=%s duration=%.0fms",
        workspace_id, status, exit_code, duration_ms,
    )

    return SandboxResult(
        exit_code    = exit_code,
        status       = status,
        stdout       = "\n".join(combined_stdout),
        stderr       = "\n".join(combined_stderr),
        duration_ms  = round(duration_ms, 1),
        workspace_id = workspace_id,
    )


# =============================================================================
# Async wrapper — called by route handlers
# =============================================================================

async def run_simulation(
    tmpdir: str,
    workspace_id: str,
    timeout: int,
) -> SandboxResult:
    """
    Async entry-point for the route handlers.

    Runs _run_simulation_sync in a thread-pool executor so the blocking
    subprocess calls don't stall FastAPI's event loop.

    Args:
        tmpdir       : Directory containing design.v and tb.v
        workspace_id : Short ID for log correlation
        timeout      : Simulation timeout in seconds

    Returns:
        SandboxResult
    """
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        _run_simulation_sync,
        tmpdir,
        workspace_id,
        timeout,
    )
    return result
