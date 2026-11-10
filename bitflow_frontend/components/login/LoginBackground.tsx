"use client";

import { useEffect, useRef } from "react";

/* ── Background decoration data — same shapes used on the landing hero ── */
const TRACES = [
  { d: "M170,180 L170,20" }, { d: "M210,180 L210,20" }, { d: "M250,180 L250,20" },
  { d: "M170,320 L170,480" }, { d: "M210,320 L210,480" }, { d: "M250,320 L250,480" },
  { d: "M140,210 L20,210" }, { d: "M140,250 L20,250" }, { d: "M140,290 L20,290" },
  { d: "M280,210 L400,210" }, { d: "M280,250 L400,250" }, { d: "M280,290 L400,290" },
];
const PADS = [
  { cx: 170, cy: 20 }, { cx: 210, cy: 20 }, { cx: 250, cy: 20 },
  { cx: 170, cy: 480 }, { cx: 210, cy: 480 }, { cx: 250, cy: 480 },
  { cx: 20, cy: 210 }, { cx: 20, cy: 250 }, { cx: 20, cy: 290 },
  { cx: 400, cy: 210 }, { cx: 400, cy: 250 }, { cx: 400, cy: 290 },
];
const DIE_CELLS = [
  { x: 151.4, y: 216.2, delay: "0s" },
  { x: 176.2, y: 265.8, delay: ".3s" },
  { x: 201, y: 191.4, delay: ".6s" },
  { x: 201, y: 290.6, delay: ".9s" },
  { x: 225.8, y: 241, delay: "1.2s" },
  { x: 250.6, y: 216.2, delay: "1.5s" },
  { x: 176.2, y: 216.2, delay: "1.8s" },
  { x: 225.8, y: 290.6, delay: "2.1s" },
];
const GR_RINGS = [
  { x: 180, y: 220, s: 60 },
  { x: 162.7, y: 202.7, s: 94.6 },
  { x: 134.9, y: 174.9, s: 150.2 },
  { x: 88.5, y: 128.5, s: 243 },
  { x: 10.8, y: 50.8, s: 398.4 },
];

/* ── Full-page background: rings + radiating chip, scaled to cover the whole viewport ── */
function PageBackground() {
  return (
    <svg
      className="bf-bg absolute inset-0 w-full h-full opacity-70"
      viewBox="0 0 420 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <style>{`@media (prefers-reduced-motion: reduce) { .bf-bg * { animation: none !important; } }`}</style>
      <g>
        {GR_RINGS.map((r, i) => (
          <rect
            key={i}
            x={r.x}
            y={r.y}
            width={r.s}
            height={r.s}
            fill="none"
            stroke="rgba(0,232,122,.13)"
            strokeWidth={1}
            className="animate-pulse_glow"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </g>

      {TRACES.map((t, i) => (
        <g key={i}>
          <path d={t.d} fill="none" stroke="rgba(0,232,122,.16)" strokeWidth={1.2} />
          <path
            d={t.d}
            pathLength={100}
            fill="none"
            stroke="#00ff88"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="16 84"
            className="animate-trace_flow"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        </g>
      ))}

      {PADS.map((p, i) => (
        <g key={i}>
          <circle cx={p.cx} cy={p.cy} r={4} fill="#0d0e11" stroke="#00e87a" strokeWidth={1.2} opacity={0.7} />
          <circle
            cx={p.cx}
            cy={p.cy}
            r={1.6}
            fill="#00e87a"
            className="animate-pulse_glow"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        </g>
      ))}

      <rect x={140} y={180} width={140} height={140} rx={8} fill="#0d0e11" stroke="rgba(0,232,122,.35)" strokeWidth={1.2} />
      <g stroke="rgba(0,232,122,.12)" strokeWidth={1}>
        <line x1={172.8} y1={188} x2={172.8} y2={312} />
        <line x1={197.6} y1={188} x2={197.6} y2={312} />
        <line x1={222.4} y1={188} x2={222.4} y2={312} />
        <line x1={247.2} y1={188} x2={247.2} y2={312} />
        <line x1={148} y1={212.8} x2={272} y2={212.8} />
        <line x1={148} y1={237.6} x2={272} y2={237.6} />
        <line x1={148} y1={262.4} x2={272} y2={262.4} />
        <line x1={148} y1={287.2} x2={272} y2={287.2} />
      </g>
      {DIE_CELLS.map((c, i) => (
        <rect
          key={i}
          x={c.x}
          y={c.y}
          width={18}
          height={18}
          rx={2}
          fill="#00e87a"
          className="animate-cell_pulse"
          style={{ animationDelay: c.delay }}
        />
      ))}
      <circle cx={210} cy={250} r={6} fill="#00e87a" className="animate-pulse_soft" />
    </svg>
  );
}

/* ── Canvas particle field: dots wander the page, spiral into the centre chip and vanish.
   Off for reduced motion; paused while the tab is hidden. ── */
function BackgroundParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;

    let raf = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", resize);

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      state: "wander" | "spiral";
      angle: number;
      radius: number;
      opacity: number;
    };

    const COUNT = 46;
    const CAPTURE_R = 150;

    function respawn(p: Particle) {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) { p.x = Math.random() * width; p.y = -10; }
      else if (edge === 1) { p.x = width + 10; p.y = Math.random() * height; }
      else if (edge === 2) { p.x = Math.random() * width; p.y = height + 10; }
      else { p.x = -10; p.y = Math.random() * height; }
      p.vx = (Math.random() - 0.5) * 0.4;
      p.vy = (Math.random() - 0.5) * 0.4;
      p.state = "wander";
      p.opacity = 0.3 + Math.random() * 0.5;
    }

    const particles: Particle[] = Array.from({ length: COUNT }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      state: "wander" as const,
      angle: 0,
      radius: 0,
      opacity: 0.3 + Math.random() * 0.5,
    }));

    function tick() {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;

      particles.forEach((p) => {
        if (p.state === "wander") {
          p.vx += (Math.random() - 0.5) * 0.05;
          p.vy += (Math.random() - 0.5) * 0.05;
          p.vx = Math.max(-0.6, Math.min(0.6, p.vx));
          p.vy = Math.max(-0.6, Math.min(0.6, p.vy));
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) {
            respawn(p);
          }

          const dx = p.x - cx;
          const dy = p.y - cy;
          const dist = Math.hypot(dx, dy);
          if (dist < CAPTURE_R) {
            p.state = "spiral";
            p.radius = dist;
            p.angle = Math.atan2(dy, dx);
          }
        } else {
          p.angle += 0.22;
          p.radius *= 0.94;
          p.x = cx + p.radius * Math.cos(p.angle);
          p.y = cy + p.radius * Math.sin(p.angle);
          p.opacity *= 0.96;
          if (p.radius < 2 || p.opacity < 0.03) {
            respawn(p);
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,232,122,${p.opacity})`;
        ctx.shadowColor = "rgba(0,232,122,0.8)";
        ctx.shadowBlur = 6;
        ctx.fill();
      });

      raf = requestAnimationFrame(tick);
    }

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", onVisibility);

    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />;
}

export default function LoginBackground() {
  return (
    <>
      <PageBackground />
      <BackgroundParticles />
    </>
  );
}
