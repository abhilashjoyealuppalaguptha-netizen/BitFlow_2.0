"""
exceptions.py — Custom exception types and global FastAPI handlers
==================================================================

By defining our own exception hierarchy we can:
  • Raise a semantically meaningful error anywhere in business logic
    (e.g. `raise SandboxImageNotFound(...)`) without importing FastAPI.
  • Map them to precise HTTP status codes in one place.
  • Keep route handlers clean — they only catch what they need to.

Registration:
    These handlers are attached to the FastAPI app in main.py via
    app.add_exception_handler(ExcType, handler_fn).
"""

from __future__ import annotations

import logging
import traceback

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


# =============================================================================
# Base
# =============================================================================

class VerilogSandboxError(Exception):
    """
    Root of the sandbox exception hierarchy.
    Every domain-specific error should inherit from this so callers can
    catch the base type when they want to handle all sandbox errors uniformly.
    """
    http_status: int = 500
    error_code: str  = "internal_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


# =============================================================================
# Input / validation errors  (4xx)
# =============================================================================

class SourceTooLargeError(VerilogSandboxError):
    """Raised when a submitted Verilog file exceeds MAX_SOURCE_BYTES."""
    http_status = 413
    error_code  = "source_too_large"


class InvalidSourceError(VerilogSandboxError):
    """
    Raised for structurally invalid input before it reaches iverilog
    (e.g. null bytes, non-UTF-8 content).
    """
    http_status = 422
    error_code  = "invalid_source"


class TimeoutValueError(VerilogSandboxError):
    """Raised when the caller requests a timeout above the server ceiling."""
    http_status = 422
    error_code  = "timeout_out_of_range"


# =============================================================================
# Docker / infrastructure errors  (5xx)
# =============================================================================

class SandboxImageNotFound(VerilogSandboxError):
    """
    Raised when the verilog-sandbox Docker image does not exist locally.
    The operator must run `docker build` before starting the API.
    """
    http_status = 503
    error_code  = "image_not_found"

    def __init__(self, image: str) -> None:
        super().__init__(
            f"Docker image '{image}' not found. "
            "Run: docker build -t verilog-sandbox:latest ."
        )
        self.image = image


class DockerDaemonError(VerilogSandboxError):
    """
    Raised when the Docker daemon is unreachable or returns an unexpected
    API error (permissions, out-of-disk, etc.).
    """
    http_status = 503
    error_code  = "docker_unavailable"


class ContainerStartError(VerilogSandboxError):
    """Raised when a container fails to start (image pull error, OOM at start, …)."""
    http_status = 503
    error_code  = "container_start_failed"


class WorkspaceError(VerilogSandboxError):
    """Raised when the host-side temp directory cannot be created or written."""
    http_status = 500
    error_code  = "workspace_error"


# =============================================================================
# Global exception handlers (registered in main.py)
# =============================================================================

async def sandbox_error_handler(
    request: Request,
    exc: VerilogSandboxError,
) -> JSONResponse:
    """
    Converts any VerilogSandboxError into a consistent JSON error response.

    Response shape:
        { "error": "image_not_found", "detail": "Docker image '...' not found. ..." }
    """
    # Log at WARNING for client errors, ERROR for server errors
    level = logging.WARNING if exc.http_status < 500 else logging.ERROR
    logger.log(level, "[%s] %s — %s", exc.error_code, request.url.path, exc.message)

    return JSONResponse(
        status_code=exc.http_status,
        content={"error": exc.error_code, "detail": exc.message},
    )


async def unhandled_error_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """
    Catch-all for any exception that was not anticipated.
    Logs the full traceback server-side; returns a safe generic message to
    the client (never expose internal stack traces to untrusted callers).
    """
    logger.error(
        "Unhandled exception on %s %s\n%s",
        request.method,
        request.url.path,
        traceback.format_exc(),
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "detail": "An unexpected server error occurred.",
        },
    )
