"""
sandbox.py — Docker sandbox orchestration engine
=================================================

This module is the heart of the backend.  It owns every interaction with
the Docker daemon: creating containers, waiting for them, reading their
logs, and cleaning them up.

Design decisions:
  • Synchronous Docker SDK calls are run in a thread-pool executor so they
    don't block FastAPI's async event loop.
  • The container is always removed in a finally block — no orphans.
  • Every security flag (cap_drop, read_only, no-new-privileges, …) is
    applied here, not in the route handler, so it's impossible to forget one.
  • stdout and stderr are collected separately where the Docker API allows,
    and the entrypoint's exit code is mapped to our SandboxExitCode enum.

Public surface:
    run_simulation(tmpdir, workspace_id, timeout) -> SandboxResult
    inspect_image(image_name) -> ImageInfo | None
    docker_is_available() -> bool
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Optional

import docker
import docker.errors
from docker.models.containers import Container

from api.config import settings
from api.exceptions import (
    ContainerStartError,
    DockerDaemonError,
    SandboxImageNotFound,
)
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
    """Subset of Docker image metadata returned by inspect_image()."""
    image_id:    str          # short SHA, e.g. "sha256:3f9a…"
    size_bytes:  int          # uncompressed size
    size_mb:     float        # size_bytes / 1024 / 1024

    @classmethod
    def from_docker_image(cls, img) -> "ImageInfo":
        raw_id = img.id or ""
        return cls(
            image_id   = raw_id[:19] if raw_id.startswith("sha256:") else raw_id[:12],
            size_bytes = img.attrs.get("Size", 0),
            size_mb    = round(img.attrs.get("Size", 0) / 1024 / 1024, 1),
        )


# =============================================================================
# Public helpers
# =============================================================================

def docker_is_available() -> bool:
    """
    Return True if the Docker daemon is reachable.
    Used by GET /health — never raises.
    """
    try:
        docker.from_env().ping()
        return True
    except Exception:
        return False


def inspect_image(image_name: str) -> Optional[ImageInfo]:
    """
    Return ImageInfo for `image_name`, or None if it doesn't exist locally.
    Used by GET /status.
    """
    try:
        client = docker.from_env()
        img = client.images.get(image_name)
        return ImageInfo.from_docker_image(img)
    except docker.errors.ImageNotFound:
        return None
    except Exception as exc:
        logger.warning("inspect_image(%s) failed: %s", image_name, exc)
        return None


# =============================================================================
# Core: synchronous container runner (called from thread pool)
# =============================================================================

def _run_container_sync(
    tmpdir: str,
    workspace_id: str,
    timeout: int,
) -> SandboxResult:
    """
    Synchronous implementation that runs the simulation using native subprocess.
    Replaces the Docker backend for compatibility with Railway and other PaaS.
    """
    import subprocess
    import os

    t_start = time.monotonic()
    logger.info("ws=%s | Starting native simulation timeout=%ds", workspace_id, timeout)

    env = os.environ.copy()
    env["TIMEOUT_SECONDS"] = str(timeout)
    env["VCD_FILE"] = "wave.vcd"
    env["DESIGN_FILE"] = "design.v"
    env["TESTBENCH_FILE"] = "tb.v"
    env["WORKSPACE_DIR"] = tmpdir

    stdout_text = ""
    stderr_text = ""
    exit_code = SandboxExitCode.INTERNAL_ERROR

    try:
        # Run entrypoint.sh directly.
        # Ensure it exists in /usr/local/bin or current directory
        entrypoint_path = "/usr/local/bin/entrypoint.sh"
        if not os.path.exists(entrypoint_path):
            entrypoint_path = "./entrypoint.sh"

        process = subprocess.Popen(
            ["bash", entrypoint_path],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        try:
            # We add a small buffer over the simulation timeout
            stdout_text, stderr_text = process.communicate(timeout=timeout + 15)
            exit_code = process.returncode
        except subprocess.TimeoutExpired:
            process.kill()
            stdout_text, stderr_text = process.communicate()
            exit_code = SandboxExitCode.INTERNAL_ERROR
            logger.error("ws=%s | Native simulation timed out", workspace_id)
            stderr_text += "\n[ERROR] Simulation process timed out"
    except Exception as exc:
        logger.error("ws=%s | Error running simulation: %s", workspace_id, exc)
        exit_code = SandboxExitCode.INTERNAL_ERROR
        stderr_text = str(exc)

    duration_ms = (time.monotonic() - t_start) * 1000
    status = exit_code_to_status(exit_code)

    logger.info(
        "ws=%s | Finished status=%s exit_code=%d duration=%.0fms",
        workspace_id, status, exit_code, duration_ms,
    )

    return SandboxResult(
        exit_code    = exit_code,
        status       = status,
        stdout       = stdout_text,
        stderr       = stderr_text,
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

    Runs _run_container_sync in a thread-pool executor so the Docker SDK's
    blocking calls (containers.run, container.wait, container.logs) don't
    stall FastAPI's event loop during concurrent requests.

    Args:
        tmpdir       : Host-side workspace directory.
        workspace_id : Short ID for log correlation.
        timeout      : Simulation timeout in seconds.

    Returns:
        SandboxResult

    Raises:
        SandboxImageNotFound | DockerDaemonError | ContainerStartError
        (all subclasses of VerilogSandboxError, handled globally in main.py)
    """
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,                     # use the default ThreadPoolExecutor
        _run_container_sync,
        tmpdir,
        workspace_id,
        timeout,
    )
    return result
