"use client";

/**
 * The hero's small "living constellation" graph — the relationship-node
 * canvas inside the hero visual card. Ported 1:1 from the animation
 * previously embedded in apps/web/app/page.tsx's raw HTML-string SCRIPT:
 * same 7 nodes/names, same curved gradient links, same travelling pulse
 * dots, same autonomous per-node drift. Distinct from CosmicBackground,
 * which is the full-page ambient starfield behind everything (that part
 * WAS consolidated onto the shared component — this is the separate,
 * small, hero-only node graph that has no existing equivalent).
 */

import { useEffect, useRef } from "react";

interface NodeSpec { n: string; x: number; y: number; you?: boolean; c: string; r: number; }

const NODES: NodeSpec[] = [
  { n: "You",    x: 0.50, y: 0.52, you: true, c: "#E6AE6C", r: 8 },
  { n: "Rosa",   x: 0.30, y: 0.24, c: "#6FB1B8", r: 5.5 },
  { n: "Daniel", x: 0.74, y: 0.26, c: "#B79AD8", r: 5.5 },
  { n: "Luna",   x: 0.82, y: 0.50, c: "#6FB1B8", r: 5 },
  { n: "Eli",    x: 0.66, y: 0.74, c: "#DA8C8C", r: 5 },
  { n: "Sofia",  x: 0.34, y: 0.78, c: "#B79AD8", r: 5 },
  { n: "Mateo",  x: 0.18, y: 0.52, c: "#6FB1B8", r: 5 },
];
const LINKS: [number, number][] = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,2],[5,6],[3,4]];

export function HeroGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const gc = canvasRef.current;
    if (!gc) return;
    const gx = gc.getContext("2d");
    if (!gx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const nodes = NODES.map((p) => ({ ...p, ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 0.5 }));
    let gW = 0, gH = 0, raf = 0;

    function sizeGraph() {
      const rect = gc!.getBoundingClientRect();
      gW = gc!.width  = rect.width  * DPR;
      gH = gc!.height = rect.height * DPR;
      gc!.style.width  = `${rect.width}px`;
      gc!.style.height = `${rect.height}px`;
    }

    function pos(p: typeof nodes[number], time: number) {
      const dx = reduce ? 0 : Math.sin(time * 0.0006 * p.sp + p.ph) * 0.012;
      const dy = reduce ? 0 : Math.cos(time * 0.0005 * p.sp + p.ph) * 0.012;
      return { x: (p.x + dx) * gW, y: (p.y + dy) * gH };
    }

    function curve(a: { x: number; y: number }, b: { x: number; y: number }) {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      let nx = -(b.y - a.y), ny = (b.x - a.x);
      const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
      const off = Math.hypot(b.x - a.x, b.y - a.y) * 0.12;
      return { cx: mx + nx * off, cy: my + ny * off };
    }

    function draw(time: number) {
      gx!.clearRect(0, 0, gW, gH);
      const P = nodes.map((p) => pos(p, time));

      for (let i = 0; i < LINKS.length; i++) {
        const a = P[LINKS[i][0]], b = P[LINKS[i][1]];
        const c = curve(a, b);
        const grad = gx!.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, "rgba(230,174,108,0.0)");
        grad.addColorStop(0.5, "rgba(230,174,108,0.32)");
        grad.addColorStop(1, "rgba(183,154,216,0.05)");
        gx!.beginPath(); gx!.moveTo(a.x, a.y);
        gx!.quadraticCurveTo(c.cx, c.cy, b.x, b.y);
        gx!.strokeStyle = grad; gx!.lineWidth = 1 * DPR; gx!.stroke();

        if (!reduce) {
          const tt = (time * 0.0002 + i * 0.3) % 1;
          const px = (1 - tt) * (1 - tt) * a.x + 2 * (1 - tt) * tt * c.cx + tt * tt * b.x;
          const py = (1 - tt) * (1 - tt) * a.y + 2 * (1 - tt) * tt * c.cy + tt * tt * b.y;
          gx!.beginPath(); gx!.arc(px, py, 1.4 * DPR, 0, Math.PI * 2);
          gx!.fillStyle = `rgba(244,236,219,${(0.5 * Math.sin(tt * Math.PI)).toFixed(3)})`; gx!.fill();
        }
      }

      for (let j = 0; j < nodes.length; j++) {
        const p = nodes[j], pt = P[j];
        const pulse = reduce ? 1 : 0.85 + 0.15 * Math.sin(time * 0.002 + p.ph);
        const R = p.r * DPR;
        const glow = gx!.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, R * 5);
        glow.addColorStop(0, p.c + (p.you ? "cc" : "88"));
        glow.addColorStop(1, "rgba(0,0,0,0)");
        gx!.beginPath(); gx!.arc(pt.x, pt.y, R * 5, 0, Math.PI * 2);
        gx!.fillStyle = glow; gx!.globalAlpha = pulse; gx!.fill(); gx!.globalAlpha = 1;
        gx!.beginPath(); gx!.arc(pt.x, pt.y, R, 0, Math.PI * 2); gx!.fillStyle = p.c; gx!.fill();
        gx!.beginPath(); gx!.arc(pt.x, pt.y, R * 0.4, 0, Math.PI * 2); gx!.fillStyle = "rgba(255,255,255,.8)"; gx!.fill();

        gx!.font = `500 ${11 * DPR}px Inter, sans-serif`;
        gx!.fillStyle = p.you ? "rgba(244,236,219,.95)" : "rgba(185,174,222,.85)";
        gx!.textAlign = "center";
        gx!.fillText(p.n, pt.x, pt.y + R + 15 * DPR);
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    }

    sizeGraph();
    raf = requestAnimationFrame(draw);
    if (reduce) draw(0);

    let rt: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(() => { sizeGraph(); if (reduce) draw(0); }, 150);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(rt);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden />;
}
