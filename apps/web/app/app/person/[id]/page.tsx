"use client";

import dynamic from "next/dynamic";

const PersonProfilePage = dynamic(() => import("./person-profile-page"), {
  loading: () => (
    <main className="app-content app-content--loading">
      <div className="skeleton skeleton-title" />
      <div className="glass-card async-frame">
        {[40, 65, 50, 80, 100, 70].map((w, i) => (
          <div key={i} className="skeleton skeleton-text" style={{ width: `${w}%` }} />
        ))}
      </div>
    </main>
  ),
});

export default function PersonProfileRoute() {
  return <PersonProfilePage />;
}
