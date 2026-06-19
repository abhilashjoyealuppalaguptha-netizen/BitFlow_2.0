// =============================================================================
// tb.v — Testbench for the 4-bit counter module
//
// What this testbench demonstrates:
//   • $dumpfile / $dumpvars  — VCD waveform generation (wave.vcd)
//   • Clock generation with always block
//   • Stimulus application with @(posedge clk) synchronisation
//   • $monitor for live signal tracing to stdout
//   • Assertion-style checks with $display and error counting
//   • Clean simulation termination with $finish
// =============================================================================

`timescale 1ns / 1ps

module tb_counter;

    // ── DUT port signals ──────────────────────────────────────────────────
    reg         clk;
    reg         rst;
    reg         en;
    wire [3:0]  count;

    // ── Error accumulator — non-zero at end means test FAILED ─────────────
    integer errors = 0;

    // ── Instantiate Design Under Test (DUT) ──────────────────────────────
    counter #(.WIDTH(4)) dut (
        .clk   (clk),
        .rst   (rst),
        .en    (en),
        .count (count)
    );

    // ── Clock generation — 10 ns period (100 MHz) ─────────────────────────
    initial clk = 1'b0;
    always  #5 clk = ~clk;   // toggle every 5 ns → full period = 10 ns

    // ── Waveform dump ─────────────────────────────────────────────────────
    // $dumpfile sets the output filename (must match VCD_FILE env var or default)
    // $dumpvars(0, tb_counter) dumps ALL signals in the entire hierarchy
    initial begin
        $dumpfile("wave.vcd");
        $dumpvars(0, tb_counter);
    end

    // ── Live signal monitor — prints whenever any listed signal changes ───
    initial begin
        $monitor("t=%0t | clk=%b rst=%b en=%b | count=%0d",
                 $time, clk, rst, en, count);
    end

    // ── Stimulus + self-checking ──────────────────────────────────────────
    initial begin
        $display("=== Counter Testbench Start ===");

        // --- Reset phase ---
        rst = 1; en = 0;
        repeat(3) @(posedge clk);     // hold reset for 3 cycles
        @(negedge clk);               // sample after falling edge for clean check
        if (count !== 4'd0) begin
            $display("FAIL [reset]: expected 0, got %0d", count);
            errors = errors + 1;
        end else begin
            $display("PASS [reset]: count = %0d", count);
        end

        // --- Enable counting ---
        @(posedge clk); rst = 0; en = 1;

        // Count from 0 to 15 (full 4-bit range) and check each value
        repeat(16) begin
            @(posedge clk);
        end
        // After 16 enabled rising edges from reset=0, count should have wrapped to 0
        @(negedge clk);
        if (count !== 4'd0) begin
            $display("FAIL [wrap]: expected 0 after wrap, got %0d", count);
            errors = errors + 1;
        end else begin
            $display("PASS [wrap]: count correctly wrapped to 0");
        end

        // --- Hold (enable low) ---
        en = 0;
        @(posedge clk); @(posedge clk);
        @(negedge clk);
        if (count !== 4'd0) begin
            $display("FAIL [hold]: count changed during en=0, got %0d", count);
            errors = errors + 1;
        end else begin
            $display("PASS [hold]: count held at 0 while en=0");
        end

        // --- Count a few and re-reset mid-stream ---
        en = 1;
        repeat(5) @(posedge clk);
        rst = 1;
        @(posedge clk);
        @(negedge clk);
        if (count !== 4'd0) begin
            $display("FAIL [mid-reset]: expected 0 after mid-stream reset, got %0d", count);
            errors = errors + 1;
        end else begin
            $display("PASS [mid-reset]: synchronous reset works mid-stream");
        end

        // ── Final result ──────────────────────────────────────────────────
        $display("=================================");
        if (errors == 0)
            $display("ALL TESTS PASSED");
        else
            $display("TESTS FAILED — %0d error(s)", errors);
        $display("=================================");

        $finish;   // cleanly ends simulation and flushes VCD
    end

endmodule
