#!/usr/bin/env bash
# =============================================================================
# entrypoint.sh — Verilog sandbox runner
#
# Execution flow:
#   1. Validate that the expected source files are present
#   2. Compile design.v + tb.v with iverilog
#   3. Run the compiled simulation under timeout(1) via vvp
#   4. Exit with a structured exit code the FastAPI caller can map to a status
#
# Exit codes (FastAPI backend should treat these as an enum):
#   0  — simulation completed successfully
#   1  — source file(s) missing
#   2  — compilation failed (iverilog returned non-zero)
#   3  — simulation timed out (killed by timeout(1))
#   4  — simulation crashed / runtime error (vvp returned non-zero)
#   5  — unexpected internal error
# =============================================================================

set -euo pipefail          # strict mode: exit on error, unset var, pipe fail
IFS=$'\n\t'               # safer word-splitting

# ── configurable via docker run -e ──────────────────────────────────────────
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-30}"
VCD_FILE="${VCD_FILE:-wave.vcd}"
DESIGN_FILE="${DESIGN_FILE:-design.v}"
TESTBENCH_FILE="${TESTBENCH_FILE:-tb.v}"
OUTPUT_BIN="${OUTPUT_BIN:-a.out}"

echo "========================================="
echo "  Verilog Sandbox — Icarus Verilog"
echo "  Timeout : ${TIMEOUT_SECONDS}s"
echo "  VCD out : ${VCD_FILE}"
echo "========================================="

# ── Step 1: validate source files ───────────────────────────────────────────
for f in "$DESIGN_FILE" "$TESTBENCH_FILE"; do
    if [[ ! -f "${WORKSPACE_DIR:-/workspace}/${f}" ]]; then
        echo "[ERROR] Required source file not found: ${WORKSPACE_DIR:-/workspace}/${f}" >&2
        exit 1
    fi
done
echo "[OK] Source files found: ${DESIGN_FILE}, ${TESTBENCH_FILE}"

# ── Step 2: compile ──────────────────────────────────────────────────────────
echo ""
echo "--- Compiling ---"
if ! iverilog -o "${WORKSPACE_DIR:-/workspace}/${OUTPUT_BIN}" \
              -Wall \
              "${WORKSPACE_DIR:-/workspace}/${DESIGN_FILE}" \
              "${WORKSPACE_DIR:-/workspace}/${TESTBENCH_FILE}" 2>&1; then
    echo "" >&2
    echo "[ERROR] Compilation failed (iverilog exited with error)." >&2
    exit 2
fi
echo "[OK] Compilation successful → ${OUTPUT_BIN}"

# ── Step 3: simulate under timeout ──────────────────────────────────────────
echo ""
echo "--- Simulating (limit: ${TIMEOUT_SECONDS}s) ---"

# timeout sends SIGTERM after $TIMEOUT_SECONDS; if the process doesn't die
# in another 5 s it sends SIGKILL.  Exit code 124 means "timed out".
timeout_exit=0
timeout --kill-after=5 "${TIMEOUT_SECONDS}" \
    vvp "${WORKSPACE_DIR:-/workspace}/${OUTPUT_BIN}" 2>&1 || timeout_exit=$?

if [[ $timeout_exit -eq 124 ]]; then
    echo "" >&2
    echo "[ERROR] Simulation exceeded ${TIMEOUT_SECONDS}s time limit and was killed." >&2
    exit 3
fi

if [[ $timeout_exit -ne 0 ]]; then
    echo "" >&2
    echo "[ERROR] Simulation runtime error (vvp exit code: ${timeout_exit})." >&2
    exit 4
fi

echo "[OK] Simulation finished successfully."

# ── Step 4: report waveform ──────────────────────────────────────────────────
if [[ -f "${WORKSPACE_DIR:-/workspace}/${VCD_FILE}" ]]; then
    vcd_size=$(stat -c%s "${WORKSPACE_DIR:-/workspace}/${VCD_FILE}")
    echo "[OK] Waveform written → ${VCD_FILE} (${vcd_size} bytes)"
else
    echo "[WARN] No VCD file produced. Check that your testbench calls \$dumpfile/\$dumpvars."
fi

echo ""
echo "========================================="
echo "  Run complete."
echo "========================================="
exit 0
