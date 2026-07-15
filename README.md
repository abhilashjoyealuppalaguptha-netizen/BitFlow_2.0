# Verilog Docker Sandbox

A production-ready, security-hardened Docker environment for compiling and
simulating Verilog designs using **Icarus Verilog**, with FastAPI backend
integration and VCD waveform generation.

---

## Repository Structure

```
verilog-sandbox/
├── Dockerfile           # Multi-stage build — sandbox image
├── entrypoint.sh        # Compile + simulate runner with timeout
├── design.v             # Sample DUT — 4-bit synchronous counter
├── tb.v                 # Sample testbench with VCD output
├── fastapi_runner.py    # FastAPI backend integration
├── docker-compose.yml   # Compose stack definition
└── README.md
```

---

## Quick Start

### 1. Build the sandbox image

```bash
docker build -t verilog-sandbox:latest .
```

### 2. Run a one-shot simulation (bind-mount your source files)

```bash
docker run --rm \
  --name verilog-run \
  \
  # ── Security flags ──────────────────────────────────────────────────── #
  --user 10001:10001            \   # non-root sandbox user
  --cap-drop ALL                \   # drop every Linux capability
  --security-opt no-new-privileges \
  --read-only                   \   # root FS is read-only
  --tmpfs /tmp:size=8m,noexec,nosuid \
  --network none                \   # no outbound network access
  \
  # ── Resource limits ─────────────────────────────────────────────────── #
  --memory 128m                 \   # hard RAM cap
  --memory-swap 128m            \   # disable swap
  --cpus 0.5                    \   # max 50% of one vCPU
  --pids-limit 64               \   # prevent fork bombs
  \
  # ── Workspace ───────────────────────────────────────────────────────── #
  -v "$(pwd)/design.v:/workspace/design.v:ro"   \
  -v "$(pwd)/tb.v:/workspace/tb.v:ro"           \
  -v "$(pwd)/output:/workspace:rw"              \
  \
  # ── Environment ─────────────────────────────────────────────────────── #
  -e TIMEOUT_SECONDS=30         \
  -e VCD_FILE=wave.vcd          \
  \
  verilog-sandbox:latest
```

> **Simplified one-liner** (for dev/testing):
> ```bash
> docker run --rm --network none --memory 128m --cpus 0.5 \
>   -v "$(pwd):/workspace" verilog-sandbox:latest
> ```

After the run, `wave.vcd` will appear in your current directory (or the output
directory if you used the separate volume mount above).

---

## Dockerfile — Section-by-Section Explanation

| Section | Purpose |
|---|---|
| `FROM ubuntu:22.04 AS builder` | Multi-stage build: isolates build-time tools from the runtime image |
| `ENV DEBIAN_FRONTEND=noninteractive` | Prevents `apt` from hanging on interactive prompts in CI |
| `apt-get install iverilog coreutils tini` | Only the three packages strictly needed at runtime |
| `rm -rf /var/lib/apt/lists/*` | Deletes the apt cache — shrinks layer size |
| `groupadd / useradd sandbox` | Creates UID/GID 10001 — never run untrusted code as root |
| `mkdir /workspace && chown sandbox` | Sandbox user owns only this directory; nothing else is writable |
| `COPY entrypoint.sh … chmod 550` | Script is executable by owner only — world cannot write it |
| `USER sandbox` | All subsequent instructions run as the unprivileged user |
| `ENV TIMEOUT_SECONDS / VCD_FILE` | Runtime defaults — overridable via `docker run -e` |
| `ENTRYPOINT ["/usr/bin/tini", …]` | tini as PID 1 for correct signal forwarding and zombie reaping |

---

## entrypoint.sh — Execution Flow

```
Start
  │
  ├─ [Step 1] Validate design.v and tb.v exist → exit 1 if missing
  │
  ├─ [Step 2] iverilog -Wall design.v tb.v → exit 2 on compile error
  │
  ├─ [Step 3] timeout ${TIMEOUT_SECONDS} vvp a.out
  │              ├─ exit 124 (timeout) → exit 3
  │              └─ non-zero           → exit 4
  │
  ├─ [Step 4] Verify wave.vcd produced → warn if absent
  │
  └─ exit 0 (success)
```

**Exit code table** (use this in your FastAPI backend):

| Code | Meaning |
|------|---------|
| `0` | Simulation completed successfully |
| `1` | Source file(s) not found |
| `2` | iverilog compilation failed |
| `3` | Simulation timed out |
| `4` | vvp runtime crash |
| `5` | Unexpected internal error |

---

## VCD Waveform

The testbench uses:
```verilog
$dumpfile("wave.vcd");
$dumpvars(0, tb_counter);   // 0 = all depths
```

The generated `wave.vcd` can be opened with:
- **GTKWave** (desktop): `gtkwave wave.vcd`
- **Surfer** (web/VSCode extension)
- Parsed by your backend and returned to the frontend as base64

---

## FastAPI Integration

### Install Python dependencies

```bash
pip install fastapi uvicorn docker python-multipart
```

### Run the API server

```bash
uvicorn fastapi_runner:app --reload --host 0.0.0.0 --port 8000
```

### POST /simulate (JSON body)

```bash
curl -X POST http://localhost:8000/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "design_v":    "module top; initial $display(\"hello\"); endmodule",
    "testbench_v": "module tb; top dut(); endmodule"
  }'
```

**Response shape:**
```json
{
  "status":    "success",
  "exit_code": 0,
  "stdout":    "=== Counter Testbench Start ===\n...",
  "stderr":    "",
  "vcd":       "JHRpbWVzY2FsZSA...",   // base64
  "vcd_bytes": 4096
}
```

### POST /simulate/upload (file upload)

```bash
curl -X POST http://localhost:8000/simulate/upload \
  -F "design=@design.v"    \
  -F "testbench=@tb.v"
```

---

## Security Architecture

### Container-level hardening (applied at runtime)

| Flag | What it does |
|------|--------------|
| `--user 10001:10001` | Run as non-root — essential for untrusted code |
| `--cap-drop ALL` | Drop all 41 Linux capabilities (no chown, no raw sockets, etc.) |
| `--security-opt no-new-privileges` | Block `setuid` / `setgid` escalation inside container |
| `--read-only` | Root filesystem is immutable — code cannot replace system binaries |
| `--tmpfs /tmp:noexec,nosuid` | Writable scratch space, but nothing can be executed from `/tmp` |
| `--network none` | Zero network access — compiled code cannot phone home |
| `--memory 128m --memory-swap 128m` | Prevent memory exhaustion / RAM-based DoS |
| `--cpus 0.5` | Prevent CPU starvation of the host (`--cpu-quota`/`--cpu-period` alternative) |
| `--pids-limit 64` | Kill fork bombs before they can saturate the host PID table |

### Input validation (FastAPI layer)

- Maximum source file size enforced (default 512 KB) before reaching Docker
- Timeout upper-bounded to 120 s even if the client sends a larger value
- Files are written to a host-side `tempfile.mkdtemp` directory, then
  bind-mounted read-only into the container — source files cannot be modified
  by the running simulation

### Docker socket (production recommendation)

The API mounts `/var/run/docker.sock` to launch sibling containers. In
production, put a **socket proxy** in front of it:

```yaml
# docker-compose.yml addition
  socket-proxy:
    image: tecnativa/docker-socket-proxy
    environment:
      CONTAINERS: 1   # allow: list/inspect containers
      POST: 1         # allow: create/start/stop containers
      # everything else defaults to 0 (denied)
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

Then point the API at `tcp://socket-proxy:2375` instead of the host socket.

### Additional production recommendations

1. **Image scanning** — run `docker scout cves verilog-sandbox:latest` or
   `trivy image verilog-sandbox:latest` in your CI pipeline before deploying.

2. **Seccomp / AppArmor** — apply a custom seccomp profile that allows only
   the syscalls iverilog/vvp actually need (open, read, write, mmap, exit…).
   Docker's default seccomp profile is a reasonable starting point.

3. **Rate limiting** — add `slowapi` or an API gateway (Kong, Traefik) in
   front of `/simulate` to prevent a single client from flooding the host with
   containers.

4. **Container registry** — push the sandbox image to a private registry
   (AWS ECR, GCR) and pull from there in production — never build on the
   production host.

5. **Ephemeral temp dirs** — the `tempfile.mkdtemp` directories created by
   FastAPI are cleaned up in the `finally` block, but add a cron job as a
   belt-and-suspenders measure:
   ```bash
   find /tmp/verilog_* -maxdepth 0 -mmin +5 -exec rm -rf {} +
   ```

---

## Resource Tuning Reference

| Scenario | `--memory` | `--cpus` | `--pids-limit` | `TIMEOUT_SECONDS` |
|---|---|---|---|---|
| Tiny student designs | 64 m | 0.25 | 32 | 10 |
| Standard assignments | 128 m | 0.5 | 64 | 30 |
| Complex SoC testbenches | 512 m | 1.0 | 128 | 120 |

---

## Building for Production (CI/CD)

```bash
# Build + tag with git SHA for immutable releases
docker build \
  --label "git-sha=$(git rev-parse --short HEAD)" \
  -t verilog-sandbox:$(git rev-parse --short HEAD) \
  -t verilog-sandbox:latest \
  .

# Push to registry
docker push your-registry/verilog-sandbox:latest

# Verify image size
docker image inspect verilog-sandbox:latest \
  --format '{{.Size}}' | numfmt --to=iec
```

---

## License

MIT — use freely, harden appropriately before exposing to the internet.
