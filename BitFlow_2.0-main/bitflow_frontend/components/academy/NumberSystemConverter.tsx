"use client";

import { useState, useCallback } from "react";

type Base = "bin" | "dec" | "hex";

function parseDec(input: string): number | null {
  const n = parseInt(input.trim(), 10);
  if (isNaN(n) || n < 0 || n > 0xffff_ffff) return null;
  return n;
}

function parseBin(input: string): number | null {
  const clean = input.trim().replace(/[\s_]/g, "");
  if (!/^[01]+$/.test(clean)) return null;
  const n = parseInt(clean, 2);
  return isNaN(n) ? null : n;
}

function parseHex(input: string): number | null {
  const clean = input.trim().replace(/^0x/i, "").replace(/[\s_]/g, "");
  if (!/^[0-9a-fA-F]+$/.test(clean)) return null;
  const n = parseInt(clean, 16);
  return isNaN(n) ? null : n;
}

function formatBin(n: number, bits = 8): string {
  return n.toString(2).padStart(bits, "0").replace(/(.{4})/g, "$1 ").trim();
}

function formatHex(n: number): string {
  return "0x" + n.toString(16).toUpperCase().padStart(2, "0");
}

const BIT_PRESETS = [4, 8, 16];

export default function NumberSystemConverter() {
  const [bits, setBits] = useState(8);
  const [active, setActive] = useState<Base>("dec");
  const [values, setValues] = useState({ bin: "0000 0000", dec: "0", hex: "0x00" });
  const [error, setError] = useState<string | null>(null);

  const syncFrom = useCallback(
    (base: Base, raw: string) => {
      let n: number | null = null;
      if (base === "dec") n = parseDec(raw);
      else if (base === "bin") n = parseBin(raw);
      else n = parseHex(raw);

      if (n === null) {
        setError(`Invalid ${base} value`);
        setValues((v) => ({ ...v, [base]: raw }));
        return;
      }

      const max = (1 << bits) - 1;
      if (n > max) {
        setError(`Value exceeds ${bits}-bit max (${max})`);
      } else {
        setError(null);
      }

      setValues({
        dec: String(n),
        bin: formatBin(n, bits),
        hex: formatHex(n),
      });
    },
    [bits]
  );

  const handleChange = (base: Base, raw: string) => {
    setActive(base);
    syncFrom(base, raw);
  };

  const handleBits = (b: number) => {
    setBits(b);
    const n = parseDec(values.dec) ?? 0;
    const clamped = Math.min(n, (1 << b) - 1);
    setValues({
      dec: String(clamped),
      bin: formatBin(clamped, b),
      hex: formatHex(clamped),
    });
    setError(null);
  };

  const n = parseDec(values.dec) ?? 0;

  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] text-ghost/80">
        Type in any field — binary, decimal, or hex sync instantly. Flip bits on the
        visualizer below!
      </p>

      <div className="flex gap-2 flex-wrap">
        {BIT_PRESETS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => handleBits(b)}
            className={`font-mono text-[9px] px-2 py-1 rounded border ${
              bits === b
                ? "border-info bg-info/15 text-info"
                : "border-rim/50 text-dim hover:border-rim"
            }`}
          >
            {b}-bit
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {(["dec", "bin", "hex"] as Base[]).map((base) => (
          <label key={base} className="block">
            <span className="font-mono text-[9px] text-dim uppercase tracking-wider mb-1 block">
              {base === "dec" ? "Decimal" : base === "bin" ? "Binary" : "Hexadecimal"}
            </span>
            <input
              type="text"
              value={values[base]}
              onChange={(e) => handleChange(base, e.target.value)}
              onFocus={() => setActive(base)}
              className={`w-full font-mono text-[12px] px-3 py-2 rounded border bg-shaft text-bright outline-none transition-colors ${
                active === base ? "border-info" : "border-rim/60"
              }`}
            />
          </label>
        ))}
      </div>

      {error && (
        <p className="font-mono text-[9px] text-danger">{error}</p>
      )}

      {/* Bit visualizer */}
      <div className="rounded border border-rim/60 bg-pit/60 p-4">
        <h4 className="font-mono text-[9px] text-dim uppercase mb-3">
          Bit visualizer — click to toggle
        </h4>
        <div className="flex flex-wrap gap-2 justify-center">
          {Array.from({ length: bits }, (_, i) => {
            const bitPos = bits - 1 - i;
            const bitVal = (n >> bitPos) & 1;
            return (
              <button
                key={bitPos}
                type="button"
                onClick={() => {
                  const flipped = n ^ (1 << bitPos);
                  setValues({
                    dec: String(flipped),
                    bin: formatBin(flipped, bits),
                    hex: formatHex(flipped),
                  });
                  setError(null);
                }}
                className={`flex flex-col items-center gap-1 transition-transform active:scale-90`}
              >
                <span
                  className={`w-9 h-11 rounded flex items-center justify-center font-mono text-sm font-bold border transition-all duration-200 ${
                    bitVal
                      ? "bg-phosphor/25 border-phosphor text-phosphor"
                      : "bg-surface border-rim/50 text-dim"
                  }`}
                >
                  {bitVal}
                </span>
                <span className="font-mono text-[7px] text-dim">2^{bitPos}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
