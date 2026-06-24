/**
 * lib/templates.ts — Verilog template library
 *
 * Pure data file — no React, no side effects.
 * Exported as a typed Record so TypeScript enforces the shape of every entry.
 *
 * ─── Adding a new template ────────────────────────────────────────────────────
 *  1. Add an entry to TEMPLATES below with a unique camelCase key.
 *  2. Fill in label, design, and testbench strings.
 *  3. The TemplateMenu component picks it up automatically — no other changes.
 *
 * ─── Sandbox-only note ────────────────────────────────────────────────────────
 *  This file is intentionally separate from any future problem-solving mode.
 *  Problem templates (with constraints, scoring, hidden tests) will live in a
 *  different module under lib/problems/ and will NOT import from here.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface VerilogTemplate {
  /** Human-readable display label shown in the dropdown. */
  label: string;
  /** Category for future grouping (not used in UI yet). */
  category: "combinational" | "sequential" | "fsm";
  /** Full contents of design.v. */
  design: string;
  /** Full contents of tb.v. */
  testbench: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────────────────

export const TEMPLATES: Record<string, VerilogTemplate> = {

  // ── Half Adder ─────────────────────────────────────────────────────────────
  halfAdder: {
    label    : "Half Adder",
    category : "combinational",
    design   : `\`timescale 1ns / 1ps

module half_adder (
    input  wire a,
    input  wire b,
    output wire sum,
    output wire carry
);
    assign sum   = a ^ b;
    assign carry = a & b;
endmodule
`,
    testbench: `\`timescale 1ns / 1ps

module tb_half_adder;
    reg  a, b;
    wire sum, carry;

    half_adder dut (.a(a), .b(b), .sum(sum), .carry(carry));

    initial begin
        $dumpfile("wave.vcd");
        $dumpvars(0, tb_half_adder);
    end

    integer errors = 0;

    task check;
        input exp_sum, exp_carry;
        begin
            #1;
            if (sum !== exp_sum || carry !== exp_carry) begin
                $display("FAIL a=%b b=%b | sum=%b (exp %b) carry=%b (exp %b)",
                         a, b, sum, exp_sum, carry, exp_carry);
                errors = errors + 1;
            end else begin
                $display("PASS a=%b b=%b => sum=%b carry=%b", a, b, sum, carry);
            end
        end
    endtask

    initial begin
        $display("=== Half Adder Test ===");
        a=0; b=0; check(0, 0);
        a=0; b=1; check(1, 0);
        a=1; b=0; check(1, 0);
        a=1; b=1; check(0, 1);
        $display(errors == 0 ? "ALL TESTS PASSED" : "TESTS FAILED");
        $finish;
    end
endmodule
`,
  },

  // ── Full Adder ─────────────────────────────────────────────────────────────
  fullAdder: {
    label    : "Full Adder",
    category : "combinational",
    design   : `\`timescale 1ns / 1ps

module full_adder (
    input  wire a,
    input  wire b,
    input  wire cin,
    output wire sum,
    output wire cout
);
    assign {cout, sum} = a + b + cin;
endmodule
`,
    testbench: `\`timescale 1ns / 1ps

module tb_full_adder;
    reg  a, b, cin;
    wire sum, cout;

    full_adder dut (.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));

    initial begin
        $dumpfile("wave.vcd");
        $dumpvars(0, tb_full_adder);
    end

    integer errors = 0;
    integer i;
    reg [1:0] expected;   // declared at module scope — Verilog-2001 compatible

    initial begin
        $display("=== Full Adder Test ===");
        for (i = 0; i < 8; i = i + 1) begin
            {a, b, cin} = i[2:0];
            #5;
            expected = a + b + cin;
            if ({cout, sum} !== expected) begin
                $display("FAIL a=%b b=%b cin=%b | got %b%b exp %b%b",
                         a, b, cin, cout, sum, expected[1], expected[0]);
                errors = errors + 1;
            end else
                $display("PASS a=%b b=%b cin=%b => cout=%b sum=%b", a, b, cin, cout, sum);
        end
        $display(errors == 0 ? "ALL TESTS PASSED" : "TESTS FAILED");
        $finish;
    end
endmodule
`,
  },

  // ── D Flip-Flop ────────────────────────────────────────────────────────────
  dFlipFlop: {
    label    : "D Flip-Flop",
    category : "sequential",
    design   : `\`timescale 1ns / 1ps

module d_flip_flop (
    input  wire clk,
    input  wire rst,   // synchronous active-high reset
    input  wire d,
    output reg  q
);
    always @(posedge clk) begin
        if (rst)
            q <= 1'b0;
        else
            q <= d;
    end
endmodule
`,
    testbench: `\`timescale 1ns / 1ps

module tb_dff;
    reg  clk, rst, d;
    wire q;

    d_flip_flop dut (.clk(clk), .rst(rst), .d(d), .q(q));

    initial clk = 0;
    always  #5 clk = ~clk;

    initial begin
        $dumpfile("wave.vcd");
        $dumpvars(0, tb_dff);
    end

    integer errors = 0;

    initial begin
        $display("=== D Flip-Flop Test ===");
        rst = 1; d = 0;
        @(posedge clk); #1;
        if (q !== 0) begin $display("FAIL reset"); errors = errors + 1; end
        else              $display("PASS reset q=%b", q);

        rst = 0; d = 1;
        @(posedge clk); #1;
        if (q !== 1) begin $display("FAIL d=1 capture"); errors = errors + 1; end
        else              $display("PASS d=1 q=%b", q);

        d = 0;
        @(posedge clk); #1;
        if (q !== 0) begin $display("FAIL d=0 capture"); errors = errors + 1; end
        else              $display("PASS d=0 q=%b", q);

        $display(errors == 0 ? "ALL TESTS PASSED" : "TESTS FAILED");
        $finish;
    end
endmodule
`,
  },

  // ── 4-bit Counter ──────────────────────────────────────────────────────────
  counter4bit: {
    label    : "4-bit Counter",
    category : "sequential",
    design   : `\`timescale 1ns / 1ps

module counter #(
    parameter WIDTH = 4
)(
    input  wire             clk,
    input  wire             rst,
    input  wire             en,
    output reg  [WIDTH-1:0] count
);
    always @(posedge clk) begin
        if (rst)
            count <= {WIDTH{1'b0}};
        else if (en)
            count <= count + 1'b1;
    end
endmodule
`,
    testbench: `\`timescale 1ns / 1ps

module tb_counter;
    reg        clk;
    reg        rst;
    reg        en;
    wire [3:0] count;

    counter #(.WIDTH(4)) dut (
        .clk(clk), .rst(rst), .en(en), .count(count)
    );

    initial clk = 0;
    always  #5 clk = ~clk;

    initial begin
        $dumpfile("wave.vcd");
        $dumpvars(0, tb_counter);
    end

    initial begin
        $display("=== Counter Test Start ===");
        rst = 1; en = 0;
        repeat(3) @(posedge clk);

        rst = 0; en = 1;
        repeat(20) @(posedge clk);

        $display("Final count: %0d", count);
        $display("=== Test Complete ===");
        $finish;
    end
endmodule
`,
  },

  // ── FSM Skeleton ───────────────────────────────────────────────────────────
  fsmSkeleton: {
    label    : "FSM Skeleton",
    category : "fsm",
    design   : `\`timescale 1ns / 1ps

// Moore FSM skeleton — 3-state sequence detector
// Detects input sequence: 1 → 0 → 1
// Extend by adding states and transitions.
module fsm (
    input  wire clk,
    input  wire rst,
    input  wire in,
    output reg  detected
);
    // ── State encoding ────────────────────────────────────────────────────
    localparam S_IDLE = 2'b00;   // waiting for first '1'
    localparam S_GOT1 = 2'b01;   // saw '1', waiting for '0'
    localparam S_GOT10= 2'b10;   // saw '10', waiting for '1'

    reg [1:0] state, next_state;

    // ── State register ────────────────────────────────────────────────────
    always @(posedge clk) begin
        if (rst) state <= S_IDLE;
        else     state <= next_state;
    end

    // ── Next-state logic ──────────────────────────────────────────────────
    always @(*) begin
        case (state)
            S_IDLE : next_state = in ? S_GOT1  : S_IDLE;
            S_GOT1 : next_state = in ? S_GOT1  : S_GOT10;
            S_GOT10: next_state = in ? S_IDLE  : S_GOT10;
            default: next_state = S_IDLE;
        endcase
    end

    // ── Output logic (Moore) ──────────────────────────────────────────────
    always @(*) begin
        detected = (state == S_GOT10) && in;
    end
endmodule
`,
    testbench: `\`timescale 1ns / 1ps

module tb_fsm;
    reg  clk, rst, in;
    wire detected;

    fsm dut (.clk(clk), .rst(rst), .in(in), .detected(detected));

    initial clk = 0;
    always  #5 clk = ~clk;

    initial begin
        $dumpfile("wave.vcd");
        $dumpvars(0, tb_fsm);
    end

    task send_bit;
        input b;
        begin
            in = b;
            @(posedge clk);
            #1;
            $display("in=%b state → detected=%b", b, detected);
        end
    endtask

    initial begin
        $display("=== FSM Sequence Detector 1-0-1 ===");
        rst = 1; in = 0;
        @(posedge clk); #1;
        rst = 0;

        // Send sequence 1-0-1 (should detect)
        send_bit(1);
        send_bit(0);
        send_bit(1);
        if (detected) $display("PASS sequence 1-0-1 detected");
        else          $display("FAIL sequence 1-0-1 not detected");

        // Send 1-1 (should NOT detect)
        send_bit(1);
        send_bit(1);
        if (!detected) $display("PASS 1-1 not detected");
        else           $display("FAIL 1-1 incorrectly detected");

        $finish;
    end
endmodule
`,
  },

}; // end TEMPLATES

/**
 * Ordered list of template keys for the dropdown menu.
 * Controls display order independently of object key order.
 */
export const TEMPLATE_ORDER: string[] = [
  "halfAdder",
  "fullAdder",
  "dFlipFlop",
  "counter4bit",
  "fsmSkeleton",
];