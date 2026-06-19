"""
fastapi_runner.py — FastAPI backend integration for the Verilog sandbox
=======================================================================

This module exposes a single POST endpoint  /simulate  that:
  1. Accepts Verilog source files (design + testbench) as a multipart upload
     or as raw strings in a JSON body.
  2. Writes the files to a temporary directory on the host.
  3. Launches the Docker sandbox container with the temp dir bind-mounted
     as /workspace (read-write only for that directory).
  4. Waits for completion, collects stdout/stderr, reads the VCD file, and
     returns a structured JSON response.
  5. Cleans up the temp directory regardless of outcome.

Requirements:
  pip install fastapi uvicorn docker python-multipart

Run (development):
  uvicorn fastapi_runner:app --reload --host 0.0.0.0 --port 8000

Production:
  uvicorn fastapi_runner:app --host 0.0.0.0 --port 8000 --workers 4
"""

from __future__ import annotations

import os
import shutil
import tempfile
import traceback
from enum import IntEnum
from pathlib import Path
from typing import Optional

import docker                          # pip install docker
from docker.errors import ContainerError, ImageNotFound, APIError
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Configuration (override via environment variables in production)
# ---------------------------------------------------------------------------
DOCKER_IMAGE      = os.getenv("VERILOG_IMAGE",    "verilog-sandbox:latest")
TIMEOUT_SECONDS   = int(os.getenv("TIMEOUT_SECONDS", "30"))
MEM_LIMIT         = os.getenv("MEM_LIMIT",         "128m")   # RAM cap per container
CPU_QUOTA         = int(os.getenv("CPU_QUOTA",     "50000")) # 50 % of one CPU core
CPU_PERIOD        = int(os.getenv("CPU_PERIOD",    "100000"))
NETWORK_DISABLED  = os.getenv("NETWORK_DISABLED",  "true").lower() == "true"
MAX_SOURCE_BYTES  = int(os.getenv("MAX_SOURCE_BYTES", str(512 * 1024)))  # 512 KB


# ---------------------------------------------------------------------------
# Exit code map (must mirror entrypoint.sh)
# ---------------------------------------------------------------------------
class SandboxExit(IntEnum):
    SUCCESS          = 0
    FILE_MISSING     = 1
    COMPILE_ERROR    = 2
    TIMEOUT          = 3
    RUNTIME_ERROR    = 4
    INTERNAL_ERROR   = 5


EXIT_STATUS_MAP: dict[int, str] = {
    SandboxExit.SUCCESS:       "success",
    SandboxExit.FILE_MISSING:  "file_missing",
    SandboxExit.COMPILE_ERROR: "compile_error",
    SandboxExit.TIMEOUT:       "timeout",
    SandboxExit.RUNTIME_ERROR: "runtime_error",
    SandboxExit.INTERNAL_ERROR:"internal_error",
}


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class SimulateRequest(BaseModel):
    """JSON body alternative — send source as strings instead of file upload."""
    design_v:    str = Field(..., description="Contents of design.v")
    testbench_v: str = Field(..., description="Contents of tb.v")
    timeout:     Optional[int] = Field(None, ge=1, le=120,
                                       description="Override timeout (1–120 s)")


class SimulateResponse(BaseModel):
    status:     str           # success | compile_error | timeout | …
    exit_code:  int
    stdout:     str
    stderr:     str
    vcd:        Optional[str] # base64-encoded VCD, or null
    vcd_bytes:  int = 0


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Verilog Sandbox API",
    description="Securely compiles and simulates Verilog inside a Docker sandbox.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["POST"],
    allow_headers=["*"],
)


def _write_sources(tmpdir: str, design: str, testbench: str) -> None:
    """Write Verilog sources to the temp workspace."""
    Path(tmpdir, "design.v").write_text(design, encoding="utf-8")
    Path(tmpdir, "tb.v").write_text(testbench, encoding="utf-8")


def _run_container(tmpdir: str, timeout: int) -> tuple[int, str, str]:
    """
    Spin up the sandbox container, wait for it, return (exit_code, stdout, stderr).
    All security flags are applied here.
    """
    client = docker.from_env()

    container = client.containers.run(
        image   = DOCKER_IMAGE,
        detach  = True,

        # ── Filesystem isolation ─────────────────────────────────────────
        volumes = {
            tmpdir: {"bind": "/workspace", "mode": "rw"},
        },
        # Make the root FS read-only; /workspace is the only writable mount
        read_only = True,
        # Provide a writable tmpfs for /tmp (needed by some libc internals)
        tmpfs     = {"/tmp": "size=8m,noexec,nosuid"},

        # ── Resource limits ──────────────────────────────────────────────
        mem_limit      = MEM_LIMIT,
        memswap_limit  = MEM_LIMIT,  # disable swap (same as mem_limit = no swap)
        cpu_quota      = CPU_QUOTA,
        cpu_period     = CPU_PERIOD,
        pids_limit     = 64,         # prevent fork bombs

        # ── Network ──────────────────────────────────────────────────────
        network_disabled = NETWORK_DISABLED,

        # ── Privilege dropping ───────────────────────────────────────────
        user              = "10001:10001",
        cap_drop          = ["ALL"],          # drop every Linux capability
        security_opt      = ["no-new-privileges"],
        privileged        = False,

        # ── Runtime config ───────────────────────────────────────────────
        environment = {
            "TIMEOUT_SECONDS": str(timeout),
            "VCD_FILE":        "wave.vcd",
        },

        # Let Docker's wait() enforce an outer wall-clock limit
        # (container timeout + 10 s buffer for startup overhead)
        # We don't use auto_remove so we can read logs first.
        auto_remove = False,
    )

    # Wait with a generous outer wall-clock ceiling
    result = container.wait(timeout=timeout + 15)
    exit_code: int = result.get("StatusCode", SandboxExit.INTERNAL_ERROR)

    logs = container.logs(stdout=True, stderr=True).decode("utf-8", errors="replace")
    # iverilog writes both compile info and runtime to stdout in our setup;
    # split stderr by convention (entrypoint uses >&2 for errors)
    stdout = logs
    stderr = ""

    container.remove(force=True)
    return exit_code, stdout, stderr


def _read_vcd(tmpdir: str) -> tuple[Optional[str], int]:
    """Return base64-encoded VCD content and its byte size, or (None, 0)."""
    import base64
    vcd_path = Path(tmpdir, "wave.vcd")
    if not vcd_path.exists():
        return None, 0
    raw = vcd_path.read_bytes()
    return base64.b64encode(raw).decode("ascii"), len(raw)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.post("/simulate", response_model=SimulateResponse)
async def simulate_json(body: SimulateRequest) -> SimulateResponse:
    """
    Accepts JSON body with design_v and testbench_v strings.
    Ideal for programmatic clients and web editors.
    """
    if len(body.design_v.encode()) > MAX_SOURCE_BYTES or \
       len(body.testbench_v.encode()) > MAX_SOURCE_BYTES:
        raise HTTPException(413, "Source file exceeds maximum allowed size.")

    timeout = body.timeout or TIMEOUT_SECONDS
    tmpdir = tempfile.mkdtemp(prefix="verilog_")
    try:
        _write_sources(tmpdir, body.design_v, body.testbench_v)
        exit_code, stdout, stderr = _run_container(tmpdir, timeout)
        vcd_b64, vcd_size = _read_vcd(tmpdir)
        return SimulateResponse(
            status    = EXIT_STATUS_MAP.get(exit_code, "unknown"),
            exit_code = exit_code,
            stdout    = stdout,
            stderr    = stderr,
            vcd       = vcd_b64,
            vcd_bytes = vcd_size,
        )
    except (ImageNotFound, APIError) as exc:
        raise HTTPException(500, f"Docker error: {exc}") from exc
    except Exception:
        raise HTTPException(500, traceback.format_exc())
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


@app.post("/simulate/upload", response_model=SimulateResponse)
async def simulate_upload(
    design:    UploadFile = File(..., description="design.v"),
    testbench: UploadFile = File(..., description="tb.v"),
    timeout:   int        = TIMEOUT_SECONDS,
) -> SimulateResponse:
    """
    Accepts multipart file uploads.
    Suitable for web forms or curl -F style uploads.
    """
    design_bytes    = await design.read()
    testbench_bytes = await testbench.read()

    if len(design_bytes) > MAX_SOURCE_BYTES or len(testbench_bytes) > MAX_SOURCE_BYTES:
        raise HTTPException(413, "Uploaded file exceeds maximum allowed size.")

    tmpdir = tempfile.mkdtemp(prefix="verilog_")
    try:
        _write_sources(
            tmpdir,
            design_bytes.decode("utf-8", errors="replace"),
            testbench_bytes.decode("utf-8", errors="replace"),
        )
        exit_code, stdout, stderr = _run_container(tmpdir, min(timeout, 120))
        vcd_b64, vcd_size = _read_vcd(tmpdir)
        return SimulateResponse(
            status    = EXIT_STATUS_MAP.get(exit_code, "unknown"),
            exit_code = exit_code,
            stdout    = stdout,
            stderr    = stderr,
            vcd       = vcd_b64,
            vcd_bytes = vcd_size,
        )
    except Exception:
        raise HTTPException(500, traceback.format_exc())
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


@app.get("/health")
def health() -> dict:
    """Liveness probe for Kubernetes / Docker healthcheck."""
    return {"status": "ok", "image": DOCKER_IMAGE}
