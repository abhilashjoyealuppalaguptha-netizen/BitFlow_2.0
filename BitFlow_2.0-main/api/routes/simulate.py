"""
routes/simulate.py — Simulation endpoints
==========================================

Endpoints:
    POST /simulate          — JSON body (design_v + testbench_v as strings)
    POST /simulate/upload   — Multipart file upload (design.v + tb.v as files)

Both endpoints share the same _execute_simulation() helper so the Docker
orchestration logic is written exactly once.

Flow for every request:
  1. Validate and size-check input
  2. Create a temporary workspace directory on the host
  3. Write design.v and tb.v into it
  4. Call sandbox.run_simulation() — this blocks (in a thread) until the
     container exits
  5. Read wave.vcd from the workspace (if produced)
  6. Build and return SimulateResponse
  7. Clean up the workspace directory (always, in finally)
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, Query, UploadFile
from fastapi.responses import JSONResponse

from api.config import settings
from api.exceptions import InvalidSourceError, SourceTooLargeError, TimeoutValueError
from api.models import SimulateJsonRequest, SimulateResponse, WaveformInfo
from api.sandbox import run_simulation
from api.utils import (
    check_source_size,
    cleanup_workspace,
    create_workspace,
    read_vcd,
    write_source_files,
)

logger  = logging.getLogger(__name__)
router  = APIRouter(prefix="/simulate", tags=["Simulation"])


# =============================================================================
# Shared simulation executor
# =============================================================================

async def _execute_simulation(
    design_v: str,
    testbench_v: str,
    timeout: int,
) -> SimulateResponse:
    """
    Core simulation pipeline shared by both endpoints.

    Args:
        design_v    : Verilog design source (contents of design.v).
        testbench_v : Verilog testbench source (contents of tb.v).
        timeout     : Simulation timeout in seconds (already validated).

    Returns:
        SimulateResponse — the complete JSON response body.
    """
    tmpdir, workspace_id = create_workspace()
    logger.info("ws=%s | New simulation request timeout=%ds", workspace_id, timeout)

    try:
        # Write source files to the host-side workspace.
        # The directory is bind-mounted into /workspace inside the container.
        write_source_files(tmpdir, design_v, testbench_v)
        logger.debug("ws=%s | Source files written to %s", workspace_id, tmpdir)

        # Launch the sandbox container and wait for it to finish.
        # This is the only async-blocking call in the pipeline.
        result = await run_simulation(tmpdir, workspace_id, timeout)

        # Read the VCD file if the testbench produced one.
        vcd_base64, vcd_size = (None, 0)
        if settings.include_vcd_in_response:
            vcd_base64, vcd_size = read_vcd(tmpdir)

        return SimulateResponse(
            status       = result.status,
            exit_code    = result.exit_code,
            success      = result.exit_code == 0,
            stdout       = result.stdout,
            stderr       = result.stderr,
            waveform     = WaveformInfo(
                available  = vcd_size > 0,
                size_bytes = vcd_size,
                vcd_base64 = vcd_base64,
            ),
            duration_ms  = result.duration_ms,
            workspace_id = workspace_id,
        )

    finally:
        # Always delete the temp directory regardless of outcome.
        cleanup_workspace(tmpdir)
        logger.debug("ws=%s | Workspace cleaned up", workspace_id)


# =============================================================================
# Endpoint 1 — JSON body
# =============================================================================

@router.post(
    "",                              # mounts at POST /simulate
    response_model=SimulateResponse,
    summary="Run simulation (JSON)",
    description=(
        "Submit Verilog source as JSON strings. "
        "Compiles with iverilog, simulates with vvp, returns stdout/stderr "
        "and an optional base64-encoded VCD waveform."
    ),
    responses={
        200: {"description": "Simulation ran (may still contain compile/runtime errors)."},
        413: {"description": "Source file exceeds the server size limit."},
        422: {"description": "Request body failed validation."},
        503: {"description": "Docker daemon unavailable or image not found."},
    },
)
async def simulate_json(body: SimulateJsonRequest) -> SimulateResponse:
    """
    **POST /simulate**

    Accepts JSON:
    ```json
    {
        "design_v":    "module top ... endmodule",
        "testbench_v": "module tb  ... endmodule",
        "timeout":     30
    }
    ```

    A 200 response does NOT always mean the simulation succeeded.
    Check `response.status` and `response.success`:
    - `"success"`       — `$finish` reached, VCD likely present
    - `"compile_error"` — iverilog rejected the code; see `stderr`
    - `"timeout"`       — simulation exceeded the time limit
    - `"runtime_error"` — vvp crashed; see `stderr`
    """
    # Size-check before touching Docker
    check_source_size(body.design_v,    settings.max_source_bytes, "design_v")
    check_source_size(body.testbench_v, settings.max_source_bytes, "testbench_v")

    # Clamp timeout to the server ceiling
    timeout = min(body.timeout or settings.timeout_seconds, settings.max_timeout_seconds)

    return await _execute_simulation(body.design_v, body.testbench_v, timeout)


# =============================================================================
# Endpoint 2 — multipart file upload
# =============================================================================

@router.post(
    "/upload",
    response_model=SimulateResponse,
    summary="Run simulation (file upload)",
    description=(
        "Upload design.v and tb.v as multipart form files. "
        "Useful for web forms or `curl -F` style clients."
    ),
    responses={
        200: {"description": "Simulation ran."},
        413: {"description": "Uploaded file exceeds the server size limit."},
        422: {"description": "Non-UTF-8 content or validation failure."},
        503: {"description": "Docker daemon unavailable or image not found."},
    },
)
async def simulate_upload(
    design:    UploadFile = File(..., description="The Verilog design file (design.v)."),
    testbench: UploadFile = File(..., description="The Verilog testbench file (tb.v)."),
    timeout:   int        = Query(
        default=30,
        ge=1,
        le=120,
        description="Simulation timeout in seconds.",
    ),
) -> SimulateResponse:
    """
    **POST /simulate/upload**

    ```bash
    curl -X POST http://localhost:8000/simulate/upload \\
         -F "design=@design.v"    \\
         -F "testbench=@tb.v"     \\
         -F "timeout=30"
    ```
    """
    # Read file bytes and enforce size limit before any further processing
    design_bytes    = await design.read()
    testbench_bytes = await testbench.read()

    check_source_size(design_bytes,    settings.max_source_bytes, "design")
    check_source_size(testbench_bytes, settings.max_source_bytes, "testbench")

    # Decode to UTF-8 — reject files with non-text content
    try:
        design_v    = design_bytes.decode("utf-8")
        testbench_v = testbench_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise InvalidSourceError(
            f"Uploaded file contains non-UTF-8 bytes: {exc}"
        ) from exc

    # Clamp timeout
    clamped_timeout = min(timeout, settings.max_timeout_seconds)

    return await _execute_simulation(design_v, testbench_v, clamped_timeout)
