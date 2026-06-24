// =============================================================================
// design.v — 4-bit synchronous up-counter with synchronous reset
//
// Interface:
//   clk   — rising-edge clock
//   rst   — synchronous active-high reset (drives count to 0)
//   en    — count-enable; when low, counter holds its value
//   count — 4-bit output representing the current count value
// =============================================================================

`timescale 1ns / 1ps   // time unit = 1 ns, precision = 1 ps

module counter #(
    parameter WIDTH = 4          // configurable bit-width; default 4
)(
    input  wire             clk,
    input  wire             rst,
    input  wire             en,
    output reg  [WIDTH-1:0] count
);

    // Synchronous reset + enable
    always @(posedge clk) begin
        if (rst)
            count <= {WIDTH{1'b0}};   // reset: clear all bits
        else if (en)
            count <= count + 1'b1;    // count up on enabled clock edges
        // else: hold — implicit latch-free register hold in synchronous design
    end

endmodule
