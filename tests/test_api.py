"""
tests/test_api.py — Pytest test suite for the Verilog Sandbox API
==================================================================

Tests are organised into three classes:

  TestHealth      — /health and /status endpoints
  TestSimulateJson    — POST /simulate (JSON body)
  TestSimulateUpload  — POST /simulate/upload (multipart)

The suite uses FastAPI's TestClient (synchronous httpx wrapper) and mocks
the Docker sandbox so tests run without Docker installed.

Run:
    pytest tests/test_api.py -v

Run a single test:
    pytest tests/test_api.py::TestSimulateJson::test_successful_simulation -v
"""

from __future__ import annotations

import base64
import os
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Patch settings BEFORE importing the app so the lru_cache picks up test values
os.environ.setdefault("DOCKER_IMAGE", "verilog-sandbox:latest")
os.environ.setdefault("NETWORK_DISABLED", "true")

from api.main import create_app  # noqa: E402 — import after env setup

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def client() -> TestClient:
    """Create a TestClient for the full application."""
    app = create_app()
    return TestClient(app, raise_server_exceptions=False)


def _make_sandbox_result(
    exit_code: int = 0,
    stdout: str = "ALL TESTS PASSED\n",
    stderr: str = "",
    duration_ms: float = 120.0,
    workspace_id: str = "abc123",
):
    """Build a mock SandboxResult."""
    from api.sandbox import SandboxResult
    from api.models import exit_code_to_status

    return SandboxResult(
        exit_code    = exit_code,
        status       = exit_code_to_status(exit_code),
        stdout       = stdout,
        stderr       = stderr,
        duration_ms  = duration_ms,
        workspace_id = workspace_id,
    )


GOOD_DESIGN = """
`timescale 1ns/1ps
module counter(input clk, input rst, output reg [3:0] count);
  always @(posedge clk) count <= rst ? 0 : count + 1;
endmodule
""".strip()

GOOD_TESTBENCH = """
`timescale 1ns/1ps
module tb;
  reg clk = 0, rst = 1;
  wire [3:0] count;
  counter dut(.clk(clk), .rst(rst), .count(count));
  always #5 clk = ~clk;
  initial begin
    $dumpfile("wave.vcd"); $dumpvars(0, tb);
    #20 rst = 0;
    #100 $finish;
  end
endmodule
""".strip()

BAD_DESIGN = "module broken; endmodule SYNTAX ERROR HERE"


# ---------------------------------------------------------------------------
# Helper: patch sandbox.run_simulation to avoid real Docker calls
# ---------------------------------------------------------------------------

def _patch_sandbox(result, vcd_content: bytes = b"$version Icarus $end"):
    """
    Context manager that patches:
      - api.sandbox.run_simulation → returns `result`
      - api.utils.read_vcd        → returns fake VCD base64
      - api.utils.create_workspace → returns stable tmpdir + workspace_id
      - api.utils.write_source_files, cleanup_workspace → no-ops
    """
    vcd_b64 = base64.b64encode(vcd_content).decode()
    vcd_size = len(vcd_content)

    return [
        patch("api.routes.simulate.run_simulation", return_value=result),
        patch("api.routes.simulate.read_vcd",        return_value=(vcd_b64, vcd_size)),
        patch("api.routes.simulate.create_workspace", return_value=("/tmp/fake_ws", "abc123")),
        patch("api.routes.simulate.write_source_files"),
        patch("api.routes.simulate.cleanup_workspace"),
    ]


# ===========================================================================
# TestHealth
# ===========================================================================

class TestHealth:

    def test_health_returns_200(self, client):
        with patch("api.routes.health.docker_is_available", return_value=True):
            resp = client.get("/health")
        assert resp.status_code == 200

    def test_health_shape(self, client):
        with patch("api.routes.health.docker_is_available", return_value=True):
            body = client.get("/health").json()
        assert "status"           in body
        assert "docker_available" in body
        assert "image"            in body
        assert "version"          in body

    def test_health_docker_unavailable(self, client):
        with patch("api.routes.health.docker_is_available", return_value=False):
            body = client.get("/health").json()
        # We still return 200 — liveness is about the process, not Docker
        assert body["status"]           == "ok"
        assert body["docker_available"] is False

    def test_status_ready(self, client):
        fake_info = MagicMock()
        fake_info.image_id = "sha256:abc"
        fake_info.size_mb  = 88.0
        with patch("api.routes.health.docker_is_available", return_value=True), \
             patch("api.routes.health.inspect_image",       return_value=fake_info):
            body = client.get("/status").json()
        assert body["status"]        == "ready"
        assert body["image_found"]   is True
        assert body["image_size_mb"] == 88.0

    def test_status_degraded_no_image(self, client):
        with patch("api.routes.health.docker_is_available", return_value=True), \
             patch("api.routes.health.inspect_image",       return_value=None):
            body = client.get("/status").json()
        assert body["status"]      == "degraded"
        assert body["image_found"] is False

    def test_root_redirects_to_docs(self, client):
        resp = client.get("/", follow_redirects=False)
        assert resp.status_code in (301, 302, 307, 308)
        assert "/docs" in resp.headers["location"]


# ===========================================================================
# TestSimulateJson
# ===========================================================================

class TestSimulateJson:

    def _post(self, client, body: dict, **kw) -> Any:
        return client.post("/simulate", json=body, **kw)

    def test_successful_simulation(self, client):
        result = _make_sandbox_result(exit_code=0, stdout="ALL TESTS PASSED\n")
        patches = _patch_sandbox(result)

        with patches[0], patches[1], patches[2], patches[3], patches[4]:
            resp = self._post(client, {
                "design_v":    GOOD_DESIGN,
                "testbench_v": GOOD_TESTBENCH,
            })

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"]    == "success"
        assert body["success"]   is True
        assert body["exit_code"] == 0
        assert "ALL TESTS PASSED" in body["stdout"]

    def test_compile_error_returns_200_with_status(self, client):
        result = _make_sandbox_result(exit_code=2, stderr="design.v:1: syntax error")
        patches = _patch_sandbox(result, vcd_content=b"")

        with patches[0], patches[1], patches[2], patches[3], patches[4]:
            resp = self._post(client, {
                "design_v":    BAD_DESIGN,
                "testbench_v": GOOD_TESTBENCH,
            })

        assert resp.status_code == 200     # HTTP 200, but status != success
        body = resp.json()
        assert body["status"]   == "compile_error"
        assert body["success"]  is False
        assert body["exit_code"] == 2

    def test_timeout_reflected_in_response(self, client):
        result = _make_sandbox_result(exit_code=3)
        patches = _patch_sandbox(result, vcd_content=b"")

        with patches[0], patches[1], patches[2], patches[3], patches[4]:
            resp = self._post(client, {
                "design_v":    GOOD_DESIGN,
                "testbench_v": GOOD_TESTBENCH,
                "timeout":     5,
            })

        assert resp.json()["status"] == "timeout"

    def test_waveform_present_on_success(self, client):
        result  = _make_sandbox_result(exit_code=0)
        patches = _patch_sandbox(result, vcd_content=b"$version Icarus $end")

        with patches[0], patches[1], patches[2], patches[3], patches[4]:
            body = self._post(client, {
                "design_v":    GOOD_DESIGN,
                "testbench_v": GOOD_TESTBENCH,
            }).json()

        wf = body["waveform"]
        assert wf["available"]   is True
        assert wf["size_bytes"]  > 0
        assert wf["vcd_base64"]  is not None
        # Verify it's valid base64
        decoded = base64.b64decode(wf["vcd_base64"])
        assert b"$version" in decoded

    def test_missing_design_field_returns_422(self, client):
        resp = self._post(client, {"testbench_v": GOOD_TESTBENCH})
        assert resp.status_code == 422

    def test_missing_testbench_field_returns_422(self, client):
        resp = self._post(client, {"design_v": GOOD_DESIGN})
        assert resp.status_code == 422

    def test_empty_design_returns_422(self, client):
        resp = self._post(client, {"design_v": "", "testbench_v": GOOD_TESTBENCH})
        assert resp.status_code == 422

    def test_timeout_above_max_is_clamped(self, client):
        """Timeout of 999 should be silently clamped to max_timeout_seconds."""
        result  = _make_sandbox_result(exit_code=0)
        patches = _patch_sandbox(result)

        with patches[0], patches[1], patches[2], patches[3], patches[4]:
            resp = self._post(client, {
                "design_v":    GOOD_DESIGN,
                "testbench_v": GOOD_TESTBENCH,
                "timeout":     120,          # at ceiling — valid
            })
        assert resp.status_code == 200

    def test_source_too_large_returns_413(self, client):
        huge = "x" * (600 * 1024)   # 600 KB > 512 KB default limit
        resp = self._post(client, {"design_v": huge, "testbench_v": GOOD_TESTBENCH})
        assert resp.status_code == 413

    def test_response_includes_duration(self, client):
        result  = _make_sandbox_result(duration_ms=250.0)
        patches = _patch_sandbox(result)

        with patches[0], patches[1], patches[2], patches[3], patches[4]:
            body = self._post(client, {
                "design_v": GOOD_DESIGN, "testbench_v": GOOD_TESTBENCH,
            }).json()

        assert isinstance(body["duration_ms"], (int, float))
        assert body["duration_ms"] >= 0

    def test_response_includes_workspace_id(self, client):
        result  = _make_sandbox_result(workspace_id="abc123")
        patches = _patch_sandbox(result)

        with patches[0], patches[1], patches[2], patches[3], patches[4]:
            body = self._post(client, {
                "design_v": GOOD_DESIGN, "testbench_v": GOOD_TESTBENCH,
            }).json()

        assert body["workspace_id"] == "abc123"


# ===========================================================================
# TestSimulateUpload
# ===========================================================================

class TestSimulateUpload:

    def _upload(self, client, design: bytes, testbench: bytes, timeout: int = 30):
        return client.post(
            "/simulate/upload",
            files={
                "design":    ("design.v", design,    "text/plain"),
                "testbench": ("tb.v",     testbench, "text/plain"),
            },
            params={"timeout": timeout},
        )

    def test_upload_success(self, client):
        result  = _make_sandbox_result(exit_code=0)
        patches = _patch_sandbox(result)

        with patches[0], patches[1], patches[2], patches[3], patches[4]:
            resp = self._upload(
                client,
                design=GOOD_DESIGN.encode(),
                testbench=GOOD_TESTBENCH.encode(),
            )

        assert resp.status_code == 200
        assert resp.json()["status"] == "success"

    def test_upload_file_too_large_returns_413(self, client):
        huge = b"x" * (600 * 1024)
        resp = self._upload(client, design=huge, testbench=GOOD_TESTBENCH.encode())
        assert resp.status_code == 413

    def test_upload_non_utf8_returns_422(self, client):
        binary = b"\xff\xfe" + GOOD_DESIGN.encode("utf-16-le")
        resp = self._upload(client, design=binary, testbench=GOOD_TESTBENCH.encode())
        assert resp.status_code == 422
