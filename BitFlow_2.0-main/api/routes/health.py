"""
routes/health.py — Observability endpoints
==========================================

Endpoints:
    GET /health   — Lightweight liveness probe (used by Docker HEALTHCHECK,
                    Kubernetes liveness probe, load balancers).
                    Never makes a Docker API call — always fast.

    GET /status   — Richer readiness probe.  Checks Docker connectivity AND
                    verifies the sandbox image is present locally.
                    Use this as a Kubernetes readiness probe.

Design philosophy:
  • /health must always return quickly (< 10 ms) so it never fails a
    health check due to Docker latency.
  • /status is allowed to be slow (it calls Docker) — it's not on the hot path.
  • Both return 200 even when degraded so reverse proxies don't drop the pod;
    the `status` field in the body tells the caller the real state.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter

from api.config import settings
from api.models import HealthResponse, StatusResponse
from api.sandbox import docker_is_available, inspect_image

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Observability"])

# Increment this when the API contract changes
API_VERSION = "1.0.0"


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness probe",
    description=(
        "Fast liveness check. Returns 200 with status='ok' when the API "
        "process is running. Does NOT verify Docker or the sandbox image."
    ),
)
def health() -> HealthResponse:
    """
    **GET /health**

    Intended for:
      - Docker `HEALTHCHECK` instruction
      - Kubernetes `livenessProbe`
      - Load balancer health checks

    Always returns 200 — a non-200 here means the Python process itself
    is broken (OOM, crash), not a dependency problem.

    ```json
    {
        "status":           "ok",
        "docker_available": true,
        "image":            "verilog-sandbox:latest",
        "version":          "1.0.0"
    }
    ```
    """
    # Quick non-blocking Docker ping — used only for the response field,
    # not to gate the HTTP status code.
    available = docker_is_available()

    return HealthResponse(
        status           = "ok",
        docker_available = available,
        image            = settings.docker_image,
        version          = API_VERSION,
    )


@router.get(
    "/status",
    response_model=StatusResponse,
    summary="Readiness probe",
    description=(
        "Richer readiness check. Verifies Docker connectivity and confirms "
        "the sandbox image is present locally. Suitable for Kubernetes "
        "readinessProbe or an ops dashboard."
    ),
)
def status() -> StatusResponse:
    """
    **GET /status**

    Checks:
      1. Docker daemon reachable
      2. Sandbox image present and inspectable

    ```json
    {
        "status":           "ready",
        "docker_available": true,
        "image_found":      true,
        "image":            "verilog-sandbox:latest",
        "image_id":         "sha256:3f9a2b1c4d8e",
        "image_size_mb":    87.4,
        "settings_summary": {
            "timeout_seconds":   30,
            "mem_limit":         "128m",
            "network_disabled":  true,
            ...
        }
    }
    ```
    """
    docker_ok  = docker_is_available()
    image_info = inspect_image(settings.docker_image) if docker_ok else None

    overall_status = (
        "ready"    if docker_ok and image_info is not None else
        "degraded" if docker_ok else
        "unavailable"
    )

    if overall_status != "ready":
        logger.warning(
            "Status check degraded: docker_ok=%s image_found=%s",
            docker_ok, image_info is not None,
        )

    return StatusResponse(
        status           = overall_status,
        docker_available = docker_ok,
        image_found      = image_info is not None,
        image            = settings.docker_image,
        image_id         = image_info.image_id  if image_info else None,
        image_size_mb    = image_info.size_mb   if image_info else None,
        settings_summary = {
            "timeout_seconds":     settings.timeout_seconds,
            "max_timeout_seconds": settings.max_timeout_seconds,
            "mem_limit":           settings.mem_limit,
            "cpu_quota":           settings.cpu_quota,
            "pids_limit":          settings.pids_limit,
            "network_disabled":    settings.network_disabled,
            "max_source_bytes":    settings.max_source_bytes,
            "include_vcd":         settings.include_vcd_in_response,
        },
    )
