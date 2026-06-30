"use client";

import { useEffect, useRef } from "react";

const NODES = [
  { name: "You", x: 0.5, y: 0.52, color: "var(--gold)" },
  { name: "Daniel", x: 0.72, y: 0.28, color: "var(--teal)" },
  { name: "Rosa", x: 0.27, y: 0.24, color: "var(--teal)" },
  { name: "Mateo", x: 0.16, y: 0.58, color: "var(--teal)" },
  { name: "Sofia", x: 0.36, y: 0.79, color: "var(--teal)" },
  { name: "Eli", x: 0.67, y: 0.74, color: "var(--teal)" },
  { name: "Luna", x: 0.83, y: 0.51, color: "var(--teal)" }
] as const;

type NodeName = (typeof NODES)[number]["name"];

const LINKS: [NodeName, NodeName][] = [
  ["You", "Daniel"],
  ["You", "Rosa"],
  ["You", "Mateo"],
  ["You", "Sofia"],
  ["You", "Eli"],
  ["You", "Luna"],
  ["Rosa", "Mateo"],
  ["Daniel", "Luna"],
  ["Sofia", "Eli"]
];

export function ConstellationHero() {
  const ambientRef = useRef<HTMLCanvasElement>(null);
  const graphRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ambientCanvas = ambientRef.current;
    const graphCanvas = graphRef.current;
    if (!ambientCanvas || !graphCanvas) return;

    const wrapper = ambientCanvas.parentElement;
    if (!wrapper) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = window.devicePixelRatio || 1;
    const ambientContext = ambientCanvas.getContext("2d");
    const graphContext = graphCanvas.getContext("2d");
    if (!ambientContext || !graphContext) return;

    let rafId = 0;
    let width = 0;
    let height = 0;
    let pointerX = 0;
    let pointerY = 0;

    const ambientStars = Array.from({ length: 64 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.8 + 0.4,
      alpha: Math.random() * 0.45 + 0.2,
      speed: Math.random() * 0.0003 + 0.0002
    }));

    const resize = () => {
      width = wrapper.clientWidth;
      height = wrapper.clientHeight;
      for (const canvas of [ambientCanvas, graphCanvas]) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const context = canvas.getContext("2d");
        context?.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    const onMove = (event: PointerEvent) => {
      const rect = wrapper.getBoundingClientRect();
      pointerX = (event.clientX - rect.left) / rect.width - 0.5;
      pointerY = (event.clientY - rect.top) / rect.height - 0.5;
    };

    const draw = (time: number) => {
      const t = time / 1000;
      ambientContext.clearRect(0, 0, width, height);
      graphContext.clearRect(0, 0, width, height);

      ambientContext.fillStyle = "rgba(244,236,219,0.4)";
      for (const star of ambientStars) {
        const twinkle = reduceMotion ? 1 : 0.7 + Math.sin(t * 2 + star.x * 8) * 0.3;
        const x = (star.x + (reduceMotion ? 0 : t * star.speed)) % 1;
        const y = star.y;
        ambientContext.globalAlpha = star.alpha * twinkle;
        ambientContext.beginPath();
        ambientContext.arc(x * width, y * height, star.r, 0, Math.PI * 2);
        ambientContext.fill();
      }
      ambientContext.globalAlpha = 1;

      const dynamicNodes = NODES.map((node, index) => {
        const phase = t * 0.6 + index;
        const drift = reduceMotion ? 0 : Math.sin(phase) * 7;
        const sway = reduceMotion ? 0 : Math.cos(phase * 0.8) * 5;
        return {
          ...node,
          px: node.x * width + drift + pointerX * 12,
          py: node.y * height + sway + pointerY * 8
        };
      });

      const byName = new Map(dynamicNodes.map((node) => [node.name, node]));
      graphContext.strokeStyle = "rgba(230,174,108,0.45)";
      graphContext.lineWidth = 1.2;
      for (const [start, end] of LINKS) {
        const a = byName.get(start);
        const b = byName.get(end);
        if (!a || !b) continue;
        graphContext.beginPath();
        graphContext.moveTo(a.px, a.py);
        graphContext.lineTo(b.px, b.py);
        graphContext.stroke();
      }

      for (const node of dynamicNodes) {
        graphContext.fillStyle = node.color;
        graphContext.strokeStyle = "rgba(244,236,219,0.9)";
        graphContext.lineWidth = 1;
        graphContext.beginPath();
        graphContext.arc(node.px, node.py, node.name === "You" ? 6 : 5, 0, Math.PI * 2);
        graphContext.fill();
        graphContext.stroke();
      }

      if (!reduceMotion) {
        rafId = window.requestAnimationFrame(draw);
      }
    };

    resize();
    wrapper.addEventListener("pointermove", onMove);
    window.addEventListener("resize", resize);
    draw(0);
    if (!reduceMotion) {
      rafId = window.requestAnimationFrame(draw);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      wrapper.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="hero-constellation">
      <canvas ref={ambientRef} aria-hidden />
      <canvas ref={graphRef} aria-hidden />
      <div className="hero-grain" aria-hidden />
      <div className="hero-vignette" aria-hidden />
      {NODES.map((node) => (
        <span key={node.name} className="hero-label" style={{ left: `${node.x * 100}%`, top: `${node.y * 100}%` }}>
          {node.name}
        </span>
      ))}
    </div>
  );
}
