"use client";

import { useState } from "react";

const SIZE = 16;

export default function MemoryVisualizer() {
  const [mem, setMem] = useState<number[]>(() => Array(SIZE).fill(0));
  const [addr, setAddr] = useState(0);
  const [dataIn, setDataIn] = useState(0);
  const [lastOp, setLastOp] = useState<string>("Ready — select address");

  const read = () => {
    const val = mem[addr];
    setDataIn(val);
    setLastOp(`READ [${addr}] → 0x${val.toString(16).toUpperCase().padStart(2, "0")} (${val})`);
    flashCell(addr, "read");
  };

  const write = () => {
    setMem((m) => {
      const next = [...m];
      next[addr] = dataIn & 0xff;
      return next;
    });
    setLastOp(`WRITE [${addr}] ← 0x${(dataIn & 0xff).toString(16).toUpperCase().padStart(2, "0")}`);
    flashCell(addr, "write");
  };

  const [flash, setFlash] = useState<{ addr: number; type: "read" | "write" } | null>(null);

  const flashCell = (a: number, type: "read" | "write") => {
    setFlash({ addr: a, type });
    setTimeout(() => setFlash(null), 600);
  };

  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] text-ghost/80">
        16-byte SRAM array — pick an address, set data, and READ or WRITE. Watch cells
        light up on access!
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Memory grid */}
        <div className="rounded border border-rim/60 bg-pit/60 p-4">
          <h4 className="font-mono text-[9px] text-dim uppercase mb-3">
            Memory array (hex)
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {mem.map((val, i) => {
              const selected = addr === i;
              const flashing = flash?.addr === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setAddr(i);
                    setLastOp(`Address selected: [${i}]`);
                  }}
                  className={`font-mono text-[10px] py-2 rounded border transition-all duration-300 ${
                    flashing && flash.type === "write"
                      ? "border-warn bg-warn/25 text-warn scale-105"
                      : flashing && flash.type === "read"
                      ? "border-info bg-info/25 text-info scale-105"
                      : selected
                      ? "border-phosphor bg-phosphor/15 text-phosphor"
                      : "border-rim/40 bg-surface/50 text-ghost hover:border-rim"
                  }`}
                >
                  <span className="text-[7px] text-dim block">[{i}]</span>
                  {val.toString(16).toUpperCase().padStart(2, "0")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="rounded border border-rim/60 bg-pit/60 p-4 space-y-4">
          <div>
            <label className="font-mono text-[9px] text-dim uppercase block mb-1">
              Address [{addr}]
            </label>
            <input
              type="range"
              min={0}
              max={SIZE - 1}
              value={addr}
              onChange={(e) => setAddr(Number(e.target.value))}
              className="w-full accent-phosphor"
            />
          </div>

          <div>
            <label className="font-mono text-[9px] text-dim uppercase block mb-1">
              Data (0–255)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                max={255}
                value={dataIn}
                onChange={(e) => setDataIn(Number(e.target.value) & 0xff)}
                className="flex-1 font-mono text-[12px] px-3 py-2 rounded border border-rim/60 bg-shaft text-bright"
              />
              <span className="font-mono text-[11px] text-info self-center">
                0x{(dataIn & 0xff).toString(16).toUpperCase().padStart(2, "0")}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={read}
              className="flex-1 font-mono text-[10px] py-2.5 rounded border border-info/50 bg-info/10 text-info hover:bg-info/20"
            >
              READ
            </button>
            <button
              type="button"
              onClick={write}
              className="flex-1 font-mono text-[10px] py-2.5 rounded border border-warn/50 bg-warn/10 text-warn hover:bg-warn/20"
            >
              WRITE
            </button>
          </div>

          <p className="font-mono text-[9px] text-phosphor border-t border-rim/30 pt-3">
            {lastOp}
          </p>

          <button
            type="button"
            onClick={() => {
              setMem(Array(SIZE).fill(0));
              setLastOp("Memory cleared");
            }}
            className="w-full font-mono text-[9px] py-1.5 rounded border border-rim/40 text-dim hover:text-ghost"
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  );
}
