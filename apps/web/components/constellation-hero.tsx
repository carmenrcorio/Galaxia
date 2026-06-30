export function ConstellationHero() {
  const nodes = [
    { name: "You", x: 49, y: 52 },
    { name: "Daniel", x: 72, y: 26 },
    { name: "Rosa", x: 28, y: 24 },
    { name: "Mateo", x: 18, y: 58 },
    { name: "Sofia", x: 36, y: 78 },
    { name: "Eli", x: 67, y: 72 },
    { name: "Luna", x: 82, y: 50 }
  ];

  const links = [
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

  const nodeMap = new Map(nodes.map((n) => [n.name, n]));

  return (
    <div style={{ position: "relative", border: "1px solid var(--line)", borderRadius: 20, background: "linear-gradient(180deg,var(--ink2),var(--ink1))", minHeight: 360, overflow: "hidden" }}>
      <svg width="100%" height="360" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        {links.map(([a, b]) => {
          const na = nodeMap.get(a)!;
          const nb = nodeMap.get(b)!;
          return <line key={`${a}-${b}`} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke="rgba(230,174,108,.45)" strokeWidth="0.18" />;
        })}
      </svg>
      {nodes.map((node, index) => (
        <div
          key={node.name}
          className="star-node"
          style={{
            position: "absolute",
            left: `${node.x}%`,
            top: `${node.y}%`,
            transform: "translate(-50%, -50%)",
            animationDelay: `${index * 0.6}s`
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 999, background: node.name === "You" ? "var(--gold)" : "var(--teal)", border: "1px solid var(--cream)" }} />
          <span style={{ display: "block", color: "var(--cream)", fontSize: 12, marginTop: 5, textAlign: "center" }}>{node.name}</span>
        </div>
      ))}
    </div>
  );
}
