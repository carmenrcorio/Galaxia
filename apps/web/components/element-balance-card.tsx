import {
  CHART_ELEMENTS,
  interpretPairElementBalance,
  type ChartElement,
  type ElementCounts,
  type PairElementBalance,
} from "@galaxia/astro";

const ELEMENT_COLOR: Record<ChartElement, string> = {
  fire: "#E8784F",
  earth: "#7FA883",
  air: "#D8B85A",
  water: "#5F9FAF",
};

// FOUNDER-REVIEW: Element balance labels.
const ELEMENT_LABEL: Record<ChartElement, string> = {
  fire: "Fire",
  earth: "Earth",
  air: "Air",
  water: "Water",
};

function PersonElementBar({ name, counts }: { name: string; counts: ElementCounts }) {
  const total = CHART_ELEMENTS.reduce((sum, element) => sum + counts[element], 0);
  return (
    <div style={{ minWidth: 0 }}>
      <p
        style={{
          color: "var(--cream)",
          fontSize: ".82rem",
          fontWeight: 600,
          margin: "0 0 7px",
          overflowWrap: "anywhere",
        }}
      >
        {name}
      </p>
      <div
        role="img"
        aria-label={`${name} element balance`}
        style={{
          display: "flex",
          width: "100%",
          height: 34,
          borderRadius: 10,
          overflow: "hidden",
          background: "rgba(255,255,255,.04)",
          border: "1px solid rgba(244,236,219,.12)",
        }}
      >
        {CHART_ELEMENTS.map((element) => {
          const count = counts[element];
          if (count === 0) return null;
          return (
            <span
              key={element}
              aria-label={`${ELEMENT_LABEL[element]} ${count} of ${total}`}
              title={`${ELEMENT_LABEL[element]} ${count} of ${total}`}
              style={{
                flex: `${count} 1 0`,
                minWidth: 0,
                display: "grid",
                placeItems: "center",
                color: "#0a0717",
                background: ELEMENT_COLOR[element],
                fontSize: ".68rem",
                fontWeight: 800,
                letterSpacing: ".02em",
                borderRight: element === "water" ? "none" : "1px solid rgba(10,7,23,.22)",
              }}
            >
              {ELEMENT_LABEL[element].charAt(0)} {count}
            </span>
          );
        })}
      </div>
      <div
        aria-hidden="true"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 5,
          marginTop: 7,
        }}
      >
        {CHART_ELEMENTS.map((element) => (
          <span
            key={element}
            style={{
              minWidth: 0,
              color: "var(--mist)",
              fontSize: ".65rem",
              lineHeight: 1.25,
              textAlign: "center",
            }}
          >
            <span style={{ color: ELEMENT_COLOR[element] }}>●</span>{" "}
            {ELEMENT_LABEL[element]} {counts[element]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ElementBalanceCard({
  nameA,
  nameB,
  balance,
}: {
  nameA: string;
  nameB: string;
  balance: PairElementBalance;
}) {
  const interpretations = interpretPairElementBalance(balance);
  return (
    <section className="glass-card fade-in fade-in-delay-2" data-testid="element-balance-card">
      {/* FOUNDER-REVIEW: Element balance card heading and scope line. */}
      <p className="eyebrow" style={{ marginBottom: 5 }}>Element balance</p>
      <p className="muted" style={{ fontSize: ".76rem", margin: "0 0 14px", lineHeight: 1.5 }}>
        Sun through Pluto, ten planets each.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
          gap: 16,
          minWidth: 0,
        }}
      >
        <PersonElementBar name={nameA} counts={balance.a} />
        <PersonElementBar name={nameB} counts={balance.b} />
      </div>
      <div
        style={{
          display: "grid",
          gap: 7,
          marginTop: 16,
          paddingTop: 14,
          borderTop: "1px solid rgba(183,154,216,.12)",
        }}
      >
        {interpretations.map((line) => (
          <p key={line} className="muted" style={{ fontSize: ".82rem", lineHeight: 1.6, margin: 0 }}>
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
