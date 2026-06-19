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
    Synchronous implementation that:
      1. Creates a Docker client
      2. Starts the sandbox container with all security flags
      3. Waits for it to finish (with an outer wall-clock ceiling)
      4. Reads logs + exit code
      5. Force-removes the container

    This function is intentionally synchronous so it can be called from
    asyncio.get_event_loop().run_in_executor() without needing an async
    Docker library.

    Args:
        tmpdir       : Host-side workspace directory (bind-mounted as /workspace).
        workspace_id : Short ID for log correlation.
        timeout      : Simulation timeout passed to the container via env var.

    Returns:
        SandboxResult with all output captured.

    Raises:
        SandboxImageNotFound  — image not present locally.
        DockerDaemonError     — daemon unreachable or API error.
        ContainerStartError   — container failed to start.
    """
    t_start = time.monotonic()
    container: Optional[Container] = None

    try:
        client = docker.from_env()
    except docker.errors.DockerException as exc:
        raise DockerDaemonError(
            f"Cannot connect to Docker daemon: {exc}. "
            "Is Docker running? Does this process have socket access?"
        ) from exc

    logger.info("ws=%s | Starting container image=%s timeout=%ds",
                workspace_id, settings.docker_image, timeout)

    try:
        container = client.containers.run(
            image   = settings.docker_image,
            detach  = True,          # returns immediately; we wait() below

            # ── Filesystem isolation ──────────────────────────────────────
            # The host tmpdir is mounted read-write as /workspace so the
            # entrypoint can write a.out and wave.vcd.  The rest of the
            # container's root FS is read-only.
            volumes={
                tmpdir: {"bind": "/workspace", "mode": "rw"},
            },
            read_only=True,

            # /tmp needs to be writable for libc and vvp internal temp files.
            # noexec prevents anything placed there from being executed.
            tmpfs={"/tmp": "size=8m,noexec,nosuid,nodev"},

            # ── Resource caps ──────────────────────────────────────────────
            mem_limit     = settings.mem_limit,
            memswap_limit = settings.mem_limit,   # mem_limit = memswap_limit → no swap
            cpu_quota     = settings.cpu_quota,
            cpu_period    = settings.cpu_period,
            pids_limit    = settings.pids_limit,  # fork-bomb protection

            # ── Network ────────────────────────────────────────────────────
            # Completely disable networking — compiled Verilog has no reason
            # to make outbound connections.
            network_disabled=settings.network_disabled,

            # ── Privilege hardening ────────────────────────────────────────
            user         = settings.sandbox_user,   # "10001:10001"
            cap_drop     = ["ALL"],                  # drop all 41 Linux capabilities
            security_opt = ["no-new-privileges"],    # block setuid / setgid escalation
            privileged   = False,

            # ── Runtime environment ────────────────────────────────────────
            # These env vars are read by entrypoint.sh
            environment={
                "TIMEOUT_SECONDS": str(timeout),
                "VCD_FILE":        "wave.vcd",
                "DESIGN_FILE":     "design.v",
                "TESTBENCH_FILE":  "tb.v",
            },

            # Do NOT auto-remove: we must read logs before removing.
            auto_remove=False,

            # Labels for observability — visible in `docker ps` and metrics
            labels={
                "app":          "verilog-sandbox",
                "workspace_id": workspace_id,
            },
        )

    except docker.errors.ImageNotFound:
        raise SandboxImageNotFound(settings.docker_image)
    except docker.errors.APIError as exc:
        raise ContainerStartError(f"Docker API error during container start: {exc}") from exc

    logger.info("ws=%s | Container %s started", workspace_id, container.short_id)

    try:
        # Wait for the container to exit.
        # Outer wall-clock ceiling = simulation timeout + 15 s startup budget.
        # If the container somehow hangs beyond this (Docker bug, kernel issue),
        # the wait() call itself raises a requests.exceptions.ReadTimeout.
        result = container.wait(timeout=timeout + 15)
        exit_code: int = result.get("StatusCode", SandboxExitCode.INTERNAL_ERROR)

        # Collect logs.  stdout=True, stderr=True returns interleaved output
        # in chronological order (Docker's default multiplexed stream).
        # We separate them by requesting each stream independently.
        raw_stdout = container.logs(stdout=True, stderr=False)
        raw_stderr = container.logs(stdout=False, stderr=True)

        stdout_text = raw_stdout.decode("utf-8", errors="replace")
        stderr_text = raw_stderr.decode("utf-8", errors="replace")

    except Exception as exc:
        # Timeout waiting for the container, or a Docker API error mid-run.
        # Map these to INTERNAL_ERROR so the caller gets a clean response.
        logger.error("ws=%s | Error waiting for container: %s", workspace_id, exc)
        exit_code    = SandboxExitCode.INTERNAL_ERROR
        stdout_text  = ""
        stderr_text  = str(exc)

    finally:
        # Always remove the container — even if wait() raised an exception.
        if container is not None:
            try:
                container.remove(force=True)
                logger.info("ws=%s | Container %s removed", workspace_id, container.short_id)
            except Exception as rm_exc:
                # Log but don't re-raise — the original error is more important.
                logger.warning("ws=%s | Failed to remove container: %s", workspace_id, rm_exc)

    duration_ms = (time.monotonic() - t_start) * 1000
    status      = exit_code_to_status(exit_code)

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
