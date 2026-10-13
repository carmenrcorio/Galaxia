"use client";

import dynamic from "next/dynamic";

const VelaChatPage = dynamic(() => import("./vela-chat-page"), {
  loading: () => (
    <main className="app-content app-content--loading">
      <div className="skeleton skeleton-title" style={{ width: "42%" }} />
      <div className="glass-card async-frame">
        {[90, 70, 85, 60].map((w, i) => (
          <div key={i} className="skeleton skeleton-text" style={{ width: `${w}%` }} />
        ))}
      </div>
    </main>
  ),
});

export default function VelaRoute() {
  return <VelaChatPage />;
}
