"""
warmup.py: make the first real request fast.

After a (re)start the simulation tools are cold: their binaries and Python imports aren't in memory,
so the first run on a freshly started instance took about 12 s against about 0.6 s for the next ones.
Right after startup, in the background, run one tiny job through the same code path a real request
takes (including the Verilator lint that the editor's Run asks for), and read the other tools' binaries.

It is best effort and bounded: it never raises, never blocks startup (the server accepts requests
immediately) and gives up after WARMUP_BUDGET_S.
"""

from __future__ import annotations

import asyncio
import logging
import shutil
import subprocess
import time

logger = logging.getLogger(__name__)

WARMUP_BUDGET_S = 60

_DESIGN = "module wu(input a, output y); assign y = ~a; endmodule\n"
_TESTBENCH = (
    "module tb; reg a = 0; wire y; wu dut(.a(a), .y(y));\n"
    "  initial begin $dumpfile(\"wave.vcd\"); $dumpvars(0, tb); #1 a = 1; #1 $finish; end\n"
    "endmodule\n"
)
# Binaries a request may need soon; --version / -V is enough to pull them into the page cache.
_TOOLS = (["yosys", "-V"], ["verible-verilog-lint", "--version"], ["ghdl", "--version"], ["verilator", "--version"])


def _read_tool(cmd: list[str]) -> None:
    if shutil.which(cmd[0]):
        subprocess.run(cmd, capture_output=True, timeout=15, check=False)


async def _warm() -> None:
    from api.routes.simulate import _execute_simulation   # late import: the routes import this app's modules
    await _execute_simulation(_DESIGN, _TESTBENCH, timeout=10, lint=True)
    for cmd in _TOOLS:
        try:
            await asyncio.to_thread(_read_tool, cmd)
        except Exception as exc:                          # a missing or odd tool must not stop the rest
            logger.debug("warm-up: %s skipped (%s)", cmd[0], exc)


async def warm_up(budget_s: float = WARMUP_BUDGET_S) -> bool:
    """Run the warm-up; True if it finished inside the budget. Never raises."""
    t0 = time.monotonic()
    try:
        await asyncio.wait_for(_warm(), timeout=budget_s)
        logger.info("Warm-up finished in %.1f s", time.monotonic() - t0)
        return True
    except asyncio.CancelledError:
        raise
    except asyncio.TimeoutError:
        logger.warning("Warm-up gave up after %.0f s", budget_s)
    except Exception as exc:
        logger.warning("Warm-up failed: %s", exc)
    return False
