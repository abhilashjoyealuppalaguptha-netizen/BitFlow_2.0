"""
lanes.py: how many jobs run at once, in two lanes.

  light: Icarus runs and the quick Yosys jobs (/metrics, /board, /synthesize, /vhdl).
  heavy: Verilator, cocotb, VHDL testbenches, formal, FPGA place-and-route, equivalence, ASIC.

Separate lanes mean a 30 s Verilator build never makes a sub-second Icarus run wait. With
MAX_HEAVY_SIMULATIONS=0 (the default) heavy jobs share the light pool, which is the old behaviour
and the right one for small hosts. Limits are per process (a shared queue would be needed across
replicas).
"""

from __future__ import annotations

import asyncio

from api.config import settings

light = asyncio.Semaphore(settings.max_concurrent_simulations)
heavy = light if settings.max_heavy_simulations == 0 else asyncio.Semaphore(settings.max_heavy_simulations)


def lane_for_simulation(design_language: str = "verilog", testbench_language: str = "verilog",
                        simulator: str = "icarus") -> asyncio.Semaphore:
    """The lane for a /simulate request: only plain Verilog on Icarus is light."""
    if simulator == "icarus" and design_language == "verilog" and testbench_language == "verilog":
        return light
    return heavy
