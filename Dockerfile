# =============================================================================
# Stage 1: Builder
# Purpose: Install build tools and Icarus Verilog in a temporary layer.
#          This stage is thrown away after the final image is assembled,
#          keeping the production image lean.
# =============================================================================
FROM ubuntu:22.04 AS builder

# Prevent apt from prompting during installs (non-interactive CI-safe mode)
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    iverilog \
    # ca-certificates is needed for any HTTPS calls during build
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*


# =============================================================================
# Stage 2: Production Runtime Image
# Purpose: Minimal image that only contains what is needed at runtime.
#          No build tools, no package managers, no extra shells.
# =============================================================================
FROM ubuntu:22.04

# --- Labels (OCI-compliant image metadata) -----------------------------------
LABEL maintainer="your-team@example.com"
LABEL description="Secure Icarus Verilog sandbox for compiling and simulating Verilog designs"
LABEL version="1.0.0"

# Inherit non-interactive mode for any RUN steps below
ENV DEBIAN_FRONTEND=noninteractive

# =============================================================================
# System dependencies
# Only install the absolute minimum needed to run iverilog / vvp at runtime.
# --no-install-recommends keeps the layer tight.
# =============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Icarus Verilog compiler (iverilog) and simulator runtime (vvp)
    iverilog \
    # timeout(1) lives in coreutils — used for simulation time-bounding
    coreutils \
    # tini is a minimal init process that correctly forwards signals
    # and reaps zombie processes — critical for container security
    tini \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean


# =============================================================================
# Unprivileged user
# NEVER run user-supplied code as root.
# UID/GID 10001 is deliberately chosen above the common range (1000) so it
# cannot accidentally collide with a host user that might be bind-mounted in.
# =============================================================================
RUN groupadd --gid 10001 sandbox \
    && useradd  --uid 10001 --gid 10001 \
                --no-create-home \
                --shell /usr/sbin/nologin \
                sandbox


# =============================================================================
# Working directory
# /workspace is the single place where design files are written and simulation
# artefacts (a.out, wave.vcd) are produced.  It is owned by the sandbox user.
# =============================================================================
RUN mkdir -p /workspace && chown sandbox:sandbox /workspace
WORKDIR /workspace


# =============================================================================
# Entrypoint script
# Copied from the build context; it wraps iverilog + vvp with:
#   • timeout enforcement (default 30 s, overridable via TIMEOUT_SECONDS)
#   • clean exit codes for the calling FastAPI backend to inspect
# =============================================================================
COPY --chown=sandbox:sandbox entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh && chmod 550 /usr/local/bin/entrypoint.sh


# =============================================================================
# Source files (design + testbench)
# Copied into /workspace so the sandbox can compile and simulate them.
# =============================================================================
COPY --chown=sandbox:sandbox api/workspace/design.v api/workspace/tb.v /workspace/


# =============================================================================
# Drop privileges permanently
# All subsequent RUN, CMD, and ENTRYPOINT instructions execute as 'sandbox'.
# =============================================================================
USER sandbox


# =============================================================================
# Runtime configuration
# TIMEOUT_SECONDS  — max wall-clock seconds allowed for vvp simulation
# VCD_FILE         — waveform output filename written to /workspace
# =============================================================================
ENV TIMEOUT_SECONDS=30
ENV VCD_FILE=wave.vcd


# =============================================================================
# tini as PID 1
# tini ensures SIGTERM/SIGKILL are forwarded correctly to child processes
# (iverilog, vvp) and that zombie processes are reaped — both matter when
# the Docker runtime sends a kill signal to stop the container.
# =============================================================================
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
