/**
 * lib/arena/verification-sv.ts — industry-style verification problems: the same "find the bugs"
 * grading as lib/arena/verification.ts, but every run is on Verilator (SystemVerilog classes,
 * randomize() with constraints, concurrent assertions) and the testbench must also reach a
 * coverage bar on the correct design (lib/grading.ts coverageShortfall). A bug counts as caught
 * when the testbench prints FAIL, an assertion fires, or the run doesn't finish.
 * Mutants come from model testbenches kept out of git (private/, scripts/import-reference-solutions.ts).
 */

import type { ArenaProblem } from "./types";

const RULES = (cov: string) => `
**How it's graded** (Verilator, SystemVerilog)

The design is **correct**. Your \`tb.v\` instantiates it as \`dut\` and checks it.

- On the correct design it must finish (\`$finish\`) with no \`FAIL\` line and no failed assertion.
- Its coverage of the design must reach **${cov}**. Run it in the sandbox with the **Verilator** simulator and open **Coverage** to see what's missed.
- Then hidden **buggy copies** of the design are run: a bug is caught when you print \`FAIL\`, an \`assert\` fires, or the run doesn't finish. Catch them all.
- You may use classes, \`randomize()\` with constraints, \`assert\` / \`assert property\` and \`cover property\`. No \`$fopen\`, \`$readmemh\` and similar.
`;

const v = (line: number, branch: number, toggle?: number) =>
  ({ simulator: "verilator" as const, minCoverage: { line, branch, ...(toggle !== undefined ? { toggle } : {}) } });

export const SV_VERIFICATION_PROBLEMS: ArenaProblem[] = [
  // ─── 1. Constrained random ─────────────────────────────────────────────────
  {
    id: "arena-ver-101",
    slug: "sv-verify-alu8-random",
    title: "Constrained Random: 8-bit ALU",
    category: "Verification",
    difficulty: "Medium",
    tags: ["verification", "systemverilog", "constrained-random", "coverage", "alu"],
    estimatedMin: 30,
    xpReward: 350,
    problemType: "testbench",
    verification: v(100, 100),
    statement: `## Constrained Random: 8-bit ALU

65,536 operand pairs × 8 operations is too many to list by hand, and the corners (0, 255, equal operands)
are where bugs hide. Write a **constrained-random** testbench: a class with \`rand\` fields and constraints that
weight the corners, a reference model in the testbench, and enough iterations to reach full coverage.

| Port | Dir | Width | Meaning |
|------|-----|-------|---------|
| \`a\`, \`b\` | in | 8 | Operands |
| \`op\` | in | 3 | 0 add, 1 sub (a − b), 2 and, 3 or, 4 xor, 5 shift left by b[2:0], 6 shift right by b[2:0], 7 a < b (unsigned) |
| \`y\` | out | 8 | Result (op 7: 1 or 0) |
| \`carry\` | out | 1 | add: carry out; sub: borrow (a < b); otherwise 0 |

${RULES("100% line and 100% branch")}`,
    examples: [{ input: "a=200, b=100, op=0", output: "y=44, carry=1", explanation: "300 − 256 = 44, with a carry" }],
    constraints: ["Instantiate the design as `dut`", "Use randomize() with constraints", "Print FAIL on a mismatch", "Call $finish"],
    starterCode: `module alu8 (
    input  logic [7:0] a,
    input  logic [7:0] b,
    input  logic [2:0] op,
    output logic [7:0] y,
    output logic       carry
);
    logic [8:0] wide;
    always_comb begin
        wide  = 9'd0;
        carry = 1'b0;
        case (op)
            3'd0: begin wide = {1'b0, a} + {1'b0, b}; y = wide[7:0]; carry = wide[8]; end
            3'd1: begin y = a - b; carry = (a < b); end
            3'd2: y = a & b;
            3'd3: y = a | b;
            3'd4: y = a ^ b;
            3'd5: y = a << b[2:0];
            3'd6: y = a >> b[2:0];
            default: y = {7'd0, (a < b)};
        endcase
    end
endmodule
`,
    testbenchSkeleton: `\`timescale 1ns/1ns
class AluTxn;
    rand bit [7:0] a, b;
    rand bit [2:0] op;
    // TODO: weight the corners, e.g. a dist { 0 := 1, 255 := 1, [1:254] :/ 8 };
endclass

module tb;
    logic [7:0] a, b, y;
    logic [2:0] op;
    logic       carry;
    int         errors = 0;

    alu8 dut (.*);

    initial begin
        AluTxn t = new;
        repeat (200) begin
            if (!t.randomize()) $fatal(1, "randomize failed");
            a = t.a; b = t.b; op = t.op; #1;
            // TODO: compute the expected y and carry here and compare.
        end
        if (errors == 0) $display("ALL TESTS PASSED");
        $finish;
    end
endmodule
`,
    hiddenTestcases: [],
  },

  // ─── 2. Concurrent assertions ──────────────────────────────────────────────
  {
    id: "arena-ver-102",
    slug: "sv-verify-rr-arbiter",
    title: "Assertions: Round-Robin Arbiter",
    category: "Verification",
    difficulty: "Medium",
    tags: ["verification", "systemverilog", "sva", "assertions", "arbiter"],
    estimatedMin: 35,
    xpReward: 375,
    problemType: "testbench",
    verification: v(100, 100),
    statement: `## Assertions: Round-Robin Arbiter

Protocol rules are clearest as **concurrent assertions** that watch every clock edge, not as checks
sprinkled through stimulus. Write the rules below as \`assert property\` statements in your testbench,
then drive requests (random is fine) so every rule gets exercised.

Two requesters share a resource. On each rising \`clk\` (synchronous active-high \`rst\`):

- \`gnt\` is one-hot or zero: never both bits.
- A grant only goes to a requester that is requesting **now**: \`gnt[i]\` implies \`req[i]\`.
- If anyone requests, someone is granted: \`|req\` implies \`|gnt\`.
- **Fairness:** when both request, the grant alternates; whoever was granted last waits.
- After \`rst\`, requester 0 has priority.

| Port | Dir | Width | Meaning |
|------|-----|-------|---------|
| \`clk\`, \`rst\` | in | 1 | Clock, synchronous reset |
| \`req\` | in | 2 | Requests |
| \`gnt\` | out | 2 | Grants (combinational from \`req\` and the priority register) |

${RULES("100% line and 100% branch")}`,
    examples: [{ input: "req=11 on three cycles after reset", output: "gnt=01, 10, 01", explanation: "both request: the grant alternates" }],
    constraints: ["Instantiate the design as `dut`", "Check the rules with assert property", "Call $finish"],
    starterCode: `module rr_arbiter (
    input  logic       clk,
    input  logic       rst,
    input  logic [1:0] req,
    output logic [1:0] gnt
);
    logic last;   // who was granted last: 0 or 1

    always_comb begin
        gnt = 2'b00;
        if (req == 2'b11) gnt = last ? 2'b01 : 2'b10;
        else if (req[0])  gnt = 2'b01;
        else if (req[1])  gnt = 2'b10;
    end

    always_ff @(posedge clk) begin
        if (rst)          last <= 1'b1;   // so requester 0 wins the first tie
        else if (gnt[0])  last <= 1'b0;
        else if (gnt[1])  last <= 1'b1;
    end
endmodule
`,
    testbenchSkeleton: `\`timescale 1ns/1ns
module tb;
    logic       clk = 0, rst = 1;
    logic [1:0] req = 0, gnt;

    rr_arbiter dut (.*);
    always #5 clk = ~clk;

    // Rules as concurrent assertions, checked on every rising edge outside reset.
    assert property (@(posedge clk) disable iff (rst) !(gnt[0] && gnt[1]))
        else $error("FAIL: both granted");
    // TODO: grant implies request; any request implies a grant; fairness on a tie.

    initial begin
        @(negedge clk); rst = 0;
        repeat (100) begin
            req = $urandom_range(0, 3);
            @(negedge clk);
        end
        $display("ALL TESTS PASSED");
        $finish;
    end
endmodule
`,
    hiddenTestcases: [],
  },

  // ─── 3. Coverage closure ───────────────────────────────────────────────────
  {
    id: "arena-ver-103",
    slug: "sv-verify-traffic-fsm",
    title: "Coverage Closure: Traffic Light with Walk Button",
    category: "Verification",
    difficulty: "Medium",
    tags: ["verification", "systemverilog", "coverage", "fsm", "cover-property"],
    estimatedMin: 35,
    xpReward: 375,
    problemType: "testbench",
    verification: v(100, 100),
    statement: `## Coverage Closure: Traffic Light with Walk Button

Random stimulus alone rarely hits rare paths, like a walk request arriving exactly during yellow.
**Coverage closure** means measuring what your tests reached, then adding directed tests for the holes.
Reach every state and every transition below, use \`cover property\` to show you did, and check the outputs.

States (rising \`clk\`, synchronous \`rst\` → GREEN): each state lasts a number of ticks, counted while \`tick\` is 1.

| State | Lights (\`light\`) | Lasts | Next |
|-------|------------------|-------|------|
| GREEN | 2'b00 | 4 ticks, or ends early after 2 if \`walk\` was pressed | YELLOW |
| YELLOW | 2'b01 | 1 tick | RED |
| RED | 2'b10 | 3 ticks; \`walk_on\` = 1 throughout | GREEN |

A \`walk\` press is remembered until the next RED starts.

${RULES("100% line and 100% branch")}`,
    examples: [{ input: "walk pressed during GREEN", output: "GREEN ends after 2 ticks", explanation: "the press shortens green" }],
    constraints: ["Instantiate the design as `dut`", "Reach every state and transition", "Call $finish"],
    starterCode: `module traffic (
    input  logic       clk,
    input  logic       rst,
    input  logic       tick,
    input  logic       walk,
    output logic [1:0] light,
    output logic       walk_on
);
    typedef enum logic [1:0] { GREEN = 2'd0, YELLOW = 2'd1, RED = 2'd2 } state_t;
    state_t     state;
    logic [2:0] count;
    logic       pending;

    assign light   = state;
    assign walk_on = (state == RED);

    always_ff @(posedge clk) begin
        if (rst) begin
            state <= GREEN; count <= 3'd0; pending <= 1'b0;
        end else begin
            if (walk) pending <= 1'b1;
            if (tick) begin
                case (state)
                    GREEN: if (count == 3'd3 || (pending && count >= 3'd1)) begin state <= YELLOW; count <= 3'd0; end
                           else count <= count + 3'd1;
                    YELLOW: begin state <= RED; count <= 3'd0; pending <= 1'b0; end
                    default: if (count == 3'd2) begin state <= GREEN; count <= 3'd0; end
                             else count <= count + 3'd1;
                endcase
            end
        end
    end
endmodule
`,
    testbenchSkeleton: `\`timescale 1ns/1ns
module tb;
    logic clk = 0, rst = 1, tick = 0, walk = 0;
    logic [1:0] light;
    logic walk_on;

    traffic dut (.*);
    always #5 clk = ~clk;

    // Show which paths you reached (they appear under Cover points).
    cover property (@(posedge clk) $past(light) == 2'b00 && light == 2'b01);
    // TODO: cover YELLOW -> RED, RED -> GREEN, and a walk press shortening GREEN.

    initial begin
        @(negedge clk); rst = 0;
        // TODO: drive tick and walk, and check light / walk_on against the table.
        $display("ALL TESTS PASSED");
        $finish;
    end
endmodule
`,
    hiddenTestcases: [],
  },

  // ─── 4. Protocol checker ───────────────────────────────────────────────────
  {
    id: "arena-ver-104",
    slug: "sv-verify-uart-tx",
    title: "Protocol Checker: UART Transmitter",
    category: "Verification",
    difficulty: "Hard",
    tags: ["verification", "systemverilog", "protocol", "uart", "sva"],
    estimatedMin: 45,
    xpReward: 450,
    problemType: "testbench",
    verification: v(100, 100),
    statement: `## Protocol Checker: UART Transmitter

Write a testbench that **decodes the serial line** like a receiver would and compares every byte with what
was sent. That's how interface IP is verified: a monitor rebuilds transactions from the wires.

8N1 framing, LSB first. A bit lasts \`CLKS_PER_BIT = 4\` clock cycles.

| Port | Dir | Width | Meaning |
|------|-----|-------|---------|
| \`clk\`, \`rst\` | in | 1 | Clock, synchronous reset |
| \`start\` | in | 1 | Pulse for one cycle with \`data\` valid, only while \`busy\` is 0 |
| \`data\` | in | 8 | Byte to send |
| \`tx\` | out | 1 | Serial line: idle 1, start bit 0, 8 data bits, stop bit 1 |
| \`busy\` | out | 1 | 1 from the cycle after \`start\` until the stop bit has been sent |

${RULES("100% line and 100% branch")}`,
    examples: [{ input: "start with data=8'hA5", output: "tx: 0, 1,0,1,0,0,1,0,1, 1", explanation: "start bit, A5 LSB first, stop bit" }],
    constraints: ["Instantiate the design as `dut`", "Decode tx and compare each byte", "Call $finish"],
    starterCode: `module uart_tx #(parameter CLKS_PER_BIT = 4) (
    input  logic       clk,
    input  logic       rst,
    input  logic       start,
    input  logic [7:0] data,
    output logic       tx,
    output logic       busy
);
    logic [9:0] shift;   // stop, data[7:0], start
    logic [3:0] bits;    // bits left to send
    logic [2:0] clks;

    assign busy = (bits != 4'd0);

    always_ff @(posedge clk) begin
        if (rst) begin
            tx <= 1'b1; bits <= 4'd0; clks <= 3'd0; shift <= 10'h3FF;
        end else if (!busy) begin
            tx <= 1'b1;
            if (start) begin shift <= {1'b1, data, 1'b0}; bits <= 4'd10; clks <= 3'd0; end
        end else begin
            tx <= shift[0];
            if (clks == CLKS_PER_BIT - 1) begin
                clks <= 3'd0; shift <= {1'b1, shift[9:1]}; bits <= bits - 4'd1;
            end else clks <= clks + 3'd1;
        end
    end
endmodule
`,
    testbenchSkeleton: `\`timescale 1ns/1ns
module tb;
    logic clk = 0, rst = 1, start = 0, tx, busy;
    logic [7:0] data = 0;

    uart_tx #(.CLKS_PER_BIT(4)) dut (.*);
    always #5 clk = ~clk;

    // TODO: a monitor that waits for the start bit (tx falling), samples each bit in its
    // middle, checks the stop bit, and compares the byte with the one that was sent.

    initial begin
        @(negedge clk); rst = 0;
        // TODO: send several bytes (0x00, 0xFF, 0xA5, random), waiting for busy to drop.
        $display("ALL TESTS PASSED");
        $finish;
    end
endmodule
`,
    hiddenTestcases: [],
  },

  // ─── 5. A property on every cycle ──────────────────────────────────────────
  {
    id: "arena-ver-105",
    slug: "sv-verify-gray-counter",
    title: "Assertions: Gray-Code Counter",
    category: "Verification",
    difficulty: "Easy",
    tags: ["verification", "systemverilog", "sva", "$past", "gray-code"],
    estimatedMin: 20,
    xpReward: 250,
    problemType: "testbench",
    verification: v(100, 100, 100),
    statement: `## Assertions: Gray-Code Counter

Some properties are easiest to state over time. A Gray-code counter's defining rule is that **exactly one bit
changes** per step: \`$countones(q ^ $past(q)) == 1\`. Check that with a concurrent assertion, plus that it
holds still when disabled and that its sequence is the binary count Gray-encoded. Toggle every bit.

| Port | Dir | Width | Meaning |
|------|-----|-------|---------|
| \`clk\`, \`rst\` | in | 1 | Clock, synchronous reset to 0 |
| \`en\` | in | 1 | Count when 1, hold when 0 |
| \`q\` | out | 4 | Gray code of an internal binary count: \`b ^ (b >> 1)\` |

${RULES("100% line, 100% branch and 100% toggle")}`,
    examples: [{ input: "en=1 for 4 cycles", output: "q = 0000, 0001, 0011, 0010, 0110", explanation: "one bit changes each step" }],
    constraints: ["Instantiate the design as `dut`", "Use $past in an assertion", "Call $finish"],
    starterCode: `module gray4 (
    input  logic       clk,
    input  logic       rst,
    input  logic       en,
    output logic [3:0] q
);
    logic [3:0] b;
    assign q = b ^ (b >> 1);
    always_ff @(posedge clk) begin
        if (rst)     b <= 4'd0;
        else if (en) b <= b + 4'd1;
    end
endmodule
`,
    testbenchSkeleton: `\`timescale 1ns/1ns
module tb;
    logic clk = 0, rst = 1, en = 0;
    logic [3:0] q;

    gray4 dut (.*);
    always #5 clk = ~clk;

    // TODO: when en was 1 on the previous edge, exactly one bit of q changed.
    // assert property (@(posedge clk) disable iff (rst) $past(en) && !$past(rst) |-> $countones(q ^ $past(q)) == 1);

    initial begin
        @(negedge clk); rst = 0;
        // TODO: count through every value (and wrap), and check holding with en = 0.
        $display("ALL TESTS PASSED");
        $finish;
    end
endmodule
`,
    hiddenTestcases: [],
  },

  // ─── 6. Scoreboard ─────────────────────────────────────────────────────────
  {
    id: "arena-ver-106",
    slug: "sv-verify-fifo-scoreboard",
    title: "Scoreboard: Synchronous FIFO",
    category: "Verification",
    difficulty: "Hard",
    tags: ["verification", "systemverilog", "scoreboard", "fifo", "constrained-random"],
    estimatedMin: 45,
    xpReward: 450,
    problemType: "testbench",
    verification: v(100, 100),
    statement: `## Scoreboard: Synchronous FIFO

A **scoreboard** keeps its own model of what the design should hold (here a SystemVerilog queue,
\`logic [7:0] model[$]\`) and checks every output against it. Drive random reads and writes, including
writes when full and reads when empty (they must be ignored), and compare \`rdata\`, \`full\`, \`empty\` and \`count\`.

Depth 4, 8-bit data, rising \`clk\`, synchronous \`rst\` (empty). \`rdata\` shows the oldest entry
(valid when not empty). A read and a write in the same cycle both happen; when full that's allowed only
together with a read.

| Port | Dir | Width | Meaning |
|------|-----|-------|---------|
| \`wr\`, \`rd\` | in | 1 | Write \`wdata\` / remove the oldest entry |
| \`wdata\` | in | 8 | Data to write |
| \`rdata\` | out | 8 | Oldest entry |
| \`full\`, \`empty\` | out | 1 | Status |
| \`count\` | out | 3 | Entries held, 0 to 4 |

${RULES("100% line and 100% branch")}`,
    examples: [{ input: "write 1, 2, 3 then read twice", output: "rdata = 1, then 2, then 3", explanation: "first in, first out" }],
    constraints: ["Instantiate the design as `dut`", "Model the FIFO with a queue", "Call $finish"],
    starterCode: `module fifo4 (
    input  logic       clk,
    input  logic       rst,
    input  logic       wr,
    input  logic       rd,
    input  logic [7:0] wdata,
    output logic [7:0] rdata,
    output logic       full,
    output logic       empty,
    output logic [2:0] count
);
    logic [7:0] mem [4];
    logic [1:0] wp, rp;

    assign full  = (count == 3'd4);
    assign empty = (count == 3'd0);
    assign rdata = mem[rp];

    wire do_rd = rd && !empty;
    wire do_wr = wr && (!full || do_rd);

    always_ff @(posedge clk) begin
        if (rst) begin
            wp <= 2'd0; rp <= 2'd0; count <= 3'd0;
        end else begin
            if (do_wr) begin mem[wp] <= wdata; wp <= wp + 2'd1; end
            if (do_rd) rp <= rp + 2'd1;
            if (do_wr && !do_rd)      count <= count + 3'd1;
            else if (do_rd && !do_wr) count <= count - 3'd1;
        end
    end
endmodule
`,
    testbenchSkeleton: `\`timescale 1ns/1ns
module tb;
    logic clk = 0, rst = 1, wr = 0, rd = 0;
    logic [7:0] wdata = 0, rdata;
    logic full, empty;
    logic [2:0] count;
    logic [7:0] model[$];   // the scoreboard's copy of the FIFO

    fifo4 dut (.*);
    always #5 clk = ~clk;

    initial begin
        @(negedge clk); rst = 0;
        repeat (300) begin
            wr = $urandom_range(0, 1); rd = $urandom_range(0, 1); wdata = $urandom;
            @(posedge clk);
            // TODO: update the model the same way the FIFO should, then after the edge compare
            // rdata (when not empty), full, empty and count with it.
            @(negedge clk);
        end
        $display("ALL TESTS PASSED");
        $finish;
    end
endmodule
`,
    hiddenTestcases: [],
  },
];
