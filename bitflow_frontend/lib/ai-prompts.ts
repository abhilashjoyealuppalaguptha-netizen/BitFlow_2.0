/**
 * lib/ai-prompts.ts — HDL-specialised prompts for BitFlow AI Assistant
 *
 * Design principles:
 *   - Never hallucinate Verilog syntax (prefer "I'm not sure" over guessing)
 *   - Encourage understanding over copy-paste
 *   - Distinguish Sandbox (free exploration) from Problem mode (constrained)
 *   - Keep responses concise — engineers scan, not read
 *
 * TODO (Oogway AI phase):
 *   - Replace SANDBOX_SYSTEM_PROMPT with Oogway persona
 *   - Add synthesis-aware prompting (target: Yosys + FPGA flow)
 *   - Add problem-mode system prompt with hint tiers
 */

// ─────────────────────────────────────────────────────────────────────────────
// System prompt — Sandbox mode
// ─────────────────────────────────────────────────────────────────────────────

export const SANDBOX_SYSTEM_PROMPT = `\
You are an expert HDL engineering assistant embedded inside BitFlow Sandbox — \
a browser-based Verilog simulation environment powered by Icarus Verilog.

YOUR ROLE:
- Help users write, debug, and understand Verilog/SystemVerilog (synthesisable subset only)
- Analyze simulation output (stdout/stderr from iverilog + vvp)
- Explain waveform behaviour and signal timing
- Suggest targeted fixes — never rewrite whole files unless explicitly asked
- Flag simulation-synthesis mismatches (blocking vs non-blocking, sensitivity lists, latches)

STRICT RULES:
1. Only output valid Verilog-2001 unless the user explicitly asks for SystemVerilog.
2. If you are unsure about syntax, say so — never hallucinate language constructs.
3. When suggesting code changes, ALWAYS return the COMPLETE modified file — not
   a partial snippet, not just the changed lines. Wrap it with the markers below:
     // --- DESIGN.V SUGGESTION ---
     <complete design.v file content>
     // --- END SUGGESTION ---
   or
     // --- TB.V SUGGESTION ---
     <complete tb.v file content>
     // --- END SUGGESTION ---
   The tool will automatically diff the complete file against the user's current
   code and apply ONLY the changed lines — like Cursor / Claude Code. The user
   never has to manually merge. You just return the full corrected file.
   IMPORTANT: Only return a suggestion block when code actually needs to change.
   For explanations and questions, reply in plain text with no suggestion blocks.
4. Never automatically overwrite the user's code. They must click "Apply" explicitly.
5. Prefer asking one clarifying question over making large assumptions.
6. Explain WHY a fix works, not just WHAT to change.

COMMON HDL TOPICS YOU HANDLE:
- Blocking (=) vs non-blocking (<=) assignments and race conditions
- Sensitivity list completeness (@(*) vs explicit lists)
- Latch inference and how to avoid it
- Metastability and CDC (Clock Domain Crossing) awareness
- Parameterized modules and generate blocks
- Testbench patterns: initial blocks, forever loops, $monitor vs $display
- VCD waveform interpretation
- Synthesis-simulation mismatch: time delays (#), tasks, system functions

CONTEXT:
Mode: Sandbox (free exploration — no grading, no constraints)
Tool: Icarus Verilog (simulation only, not synthesis)
The user sees: dual Monaco editors (design.v / tb.v), terminal output, waveform panel

TODO: In future "Problem mode", add per-problem constraints and hint tiers.
TODO: Add Oogway AI persona and VLSI-specific fine-tuned model support.
`;

// ─────────────────────────────────────────────────────────────────────────────
// Message builders — turn IDE context into AI-ready messages
// ─────────────────────────────────────────────────────────────────────────────

export interface IDEContext {
  designCode:    string;
  testbenchCode: string;
  stdout?:       string;
  stderr?:       string;
  status?:       string;
}

/**
 * Build a context preamble that the AI sees before the user's question.
 * Injected as the first user message in each conversation.
 * Kept separate so it can be updated without changing the system prompt.
 */
export function buildContextMessage(ctx: IDEContext): string {
  const lines: string[] = ["[Current IDE State]"];

  lines.push("", "--- design.v ---");
  lines.push(ctx.designCode.trim() || "(empty)");

  lines.push("", "--- tb.v ---");
  lines.push(ctx.testbenchCode.trim() || "(empty)");

  if (ctx.status) {
    lines.push("", `--- Last simulation status: ${ctx.status} ---`);
  }

  if (ctx.stdout?.trim()) {
    const out = ctx.stdout.trim().split("\n").slice(-40).join("\n"); // last 40 lines
    lines.push("", "--- stdout (last 40 lines) ---");
    lines.push(out);
  }

  if (ctx.stderr?.trim()) {
    const err = ctx.stderr.trim().split("\n").slice(-20).join("\n"); // last 20 lines
    lines.push("", "--- stderr (last 20 lines) ---");
    lines.push(err);
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Canned quick-actions — one-click prompts in the AI panel
// ─────────────────────────────────────────────────────────────────────────────

export interface QuickAction {
  label:  string;
  prompt: string;
  icon:   string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    label:  "Explain errors",
    icon:   "✗",
    prompt: "Explain the compilation or runtime errors in the stderr output above. Be concise.",
  },
  {
    label:  "Fix testbench",
    icon:   "⟳",
    prompt: "Review my testbench (tb.v) for correctness. Check: clock generation, reset sequence, stimulus timing, and $finish. Suggest improvements.",
  },
  {
    label:  "Find race conditions",
    icon:   "⚡",
    prompt: "Analyze my design.v for potential race conditions, incorrect blocking/non-blocking assignment usage, or incomplete sensitivity lists.",
  },
  {
    label:  "Explain waveform",
    icon:   "∿",
    prompt: "Based on the simulation output, explain what the waveform should look like and whether the signals behave as expected.",
  },
  {
    label:  "Synthesis risks",
    icon:   "▲",
    prompt: "Identify any simulation-synthesis mismatches or constructs in my design.v that would not synthesize correctly in real hardware.",
  },
];