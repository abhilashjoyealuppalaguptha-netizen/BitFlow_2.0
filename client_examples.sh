#!/usr/bin/env bash
# =============================================================================
# client_examples.sh — API usage examples
#
# Covers every endpoint with both curl and Python snippets.
# Run individual sections by copying them to your terminal.
#
# Prerequisites:
#   • API running:  uvicorn api.main:app --reload
#   • curl installed
#   • Python + httpx: pip install httpx
# =============================================================================

BASE="http://localhost:8000"

echo "================================================================"
echo " Example 1 — GET /health (liveness probe)"
echo "================================================================"
curl -s "$BASE/health" | python3 -m json.tool
# Expected:
# {
#     "status": "ok",
#     "docker_available": true,
#     "image": "verilog-sandbox:latest",
#     "version": "1.0.0"
# }

echo ""
echo "================================================================"
echo " Example 2 — GET /status (readiness probe)"
echo "================================================================"
curl -s "$BASE/status" | python3 -m json.tool
# Expected when everything is healthy:
# {
#     "status": "ready",
#     "docker_available": true,
#     "image_found": true,
#     "image": "verilog-sandbox:latest",
#     "image_id": "sha256:3f9a...",
#     "image_size_mb": 87.4,
#     "settings_summary": { ... }
# }

echo ""
echo "================================================================"
echo " Example 3 — POST /simulate (JSON body, happy path)"
echo "================================================================"
curl -s -X POST "$BASE/simulate" \
  -H "Content-Type: application/json" \
  -d '{
    "design_v": "`timescale 1ns/1ps\nmodule counter(input clk, input rst, output reg [3:0] count);\n  always @(posedge clk) count <= rst ? 0 : count + 1;\nendmodule",
    "testbench_v": "`timescale 1ns/1ps\nmodule tb;\n  reg clk=0, rst=1;\n  wire [3:0] count;\n  counter dut(.clk(clk),.rst(rst),.count(count));\n  always #5 clk=~clk;\n  initial begin\n    $dumpfile(\"wave.vcd\"); $dumpvars(0,tb);\n    #20 rst=0; #100 $display(\"count=%0d\",count); $finish;\n  end\nendmodule",
    "timeout": 30
  }' | python3 -m json.tool
# Expected:
# {
#     "status": "success",
#     "exit_code": 0,
#     "success": true,
#     "stdout": "count=10\n",
#     "stderr": "",
#     "waveform": {
#         "available": true,
#         "size_bytes": 1024,
#         "vcd_base64": "JHZlcnNpb24gSWNhcnVzIFZlcmlsb2cgdmVyaW9uIDEyLjAgKHN0YWJsZSkgJGVuZA..."
#     },
#     "duration_ms": 340.5,
#     "workspace_id": "3f9a2b"
# }

echo ""
echo "================================================================"
echo " Example 4 — POST /simulate with compile error"
echo "================================================================"
curl -s -X POST "$BASE/simulate" \
  -H "Content-Type: application/json" \
  -d '{
    "design_v":    "module broken; THIS IS NOT VALID VERILOG endmodule",
    "testbench_v": "module tb; broken dut(); endmodule"
  }' | python3 -m json.tool
# Expected:
# {
#     "status": "compile_error",
#     "exit_code": 2,
#     "success": false,
#     "stdout": "...",
#     "stderr": "design.v:1: error: ...",
#     "waveform": { "available": false, "size_bytes": 0, "vcd_base64": null },
#     ...
# }

echo ""
echo "================================================================"
echo " Example 5 — POST /simulate/upload (file upload)"
echo "================================================================"
curl -s -X POST "$BASE/simulate/upload" \
  -F "design=@design.v"    \
  -F "testbench=@tb.v"     \
  -F "timeout=30"          \
  | python3 -m json.tool

echo ""
echo "================================================================"
echo " Example 6 — Decode and save the VCD waveform (Python)"
echo "================================================================"
python3 - <<'PYTHON'
import httpx, base64, pathlib, json

# ── 1. Read source files ────────────────────────────────────────────────────
design_v    = pathlib.Path("design.v").read_text()
testbench_v = pathlib.Path("tb.v").read_text()

# ── 2. Submit simulation ────────────────────────────────────────────────────
resp = httpx.post(
    "http://localhost:8000/simulate",
    json={"design_v": design_v, "testbench_v": testbench_v, "timeout": 30},
    timeout=60,   # outer HTTP timeout: simulation timeout + overhead
)
resp.raise_for_status()
body = resp.json()

print(f"Status     : {body['status']}")
print(f"Exit code  : {body['exit_code']}")
print(f"Duration   : {body['duration_ms']:.0f} ms")
print(f"Workspace  : {body['workspace_id']}")
print(f"Stdout     :\n{body['stdout']}")
if body['stderr']:
    print(f"Stderr     :\n{body['stderr']}")

# ── 3. Save VCD file ────────────────────────────────────────────────────────
wf = body["waveform"]
if wf["available"] and wf["vcd_base64"]:
    raw = base64.b64decode(wf["vcd_base64"])
    out = pathlib.Path("wave.vcd")
    out.write_bytes(raw)
    print(f"\nWaveform   : {out} ({wf['size_bytes']:,} bytes)")
    print("Open with  : gtkwave wave.vcd")
else:
    print("\nNo waveform produced (check testbench for $dumpfile/$dumpvars).")
PYTHON

echo ""
echo "================================================================"
echo " Example 7 — File upload with Python httpx"
echo "================================================================"
python3 - <<'PYTHON'
import httpx, pathlib

with open("design.v", "rb") as d, open("tb.v", "rb") as t:
    resp = httpx.post(
        "http://localhost:8000/simulate/upload",
        files={
            "design":    ("design.v", d, "text/plain"),
            "testbench": ("tb.v",     t, "text/plain"),
        },
        params={"timeout": 30},
        timeout=60,
    )

resp.raise_for_status()
body = resp.json()
print(f"Status: {body['status']}  |  Duration: {body['duration_ms']:.0f}ms")
PYTHON

echo ""
echo "================================================================"
echo " Example 8 — Check status then run (production-safe pattern)"
echo "================================================================"
python3 - <<'PYTHON'
import httpx, sys

# Always confirm the sandbox is ready before submitting work
status = httpx.get("http://localhost:8000/status", timeout=5).json()
if status["status"] != "ready":
    print(f"Sandbox not ready: {status['status']}")
    print(f"Docker available : {status['docker_available']}")
    print(f"Image found      : {status['image_found']}")
    sys.exit(1)

print(f"Sandbox ready — image {status['image']} ({status['image_size_mb']} MB)")

# Now safe to submit
import pathlib
resp = httpx.post(
    "http://localhost:8000/simulate",
    json={
        "design_v":    pathlib.Path("design.v").read_text(),
        "testbench_v": pathlib.Path("tb.v").read_text(),
    },
    timeout=60,
)
body = resp.json()
print(f"Result: {body['status']}")
PYTHON
