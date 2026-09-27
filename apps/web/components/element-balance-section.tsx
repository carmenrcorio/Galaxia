import {
  CHART_ELEMENTS,
  pairElementBalanceInterpretation,
  type ChartElement,
  type ElementCounts,
  type PairElementBalance,
} from "@galaxia/astro";

const ELEMENT_COLORS: Record<ChartElement, string> = {
  fire: "#DD7651",
  earth: "#7D9B78",
  air: "#D6B65E",
  water: "#6FAFB8",
};

function label(element: ChartElement): string {
  return `${element[0]!.toUpperCase()}${element.slice(1)}`;
}

function ElementBar({ name, counts }: { name: string; counts: ElementCounts }) {
  const total = CHART_ELEMENTS.reduce((sum, element) => sum + counts[element], 0);

  return (
    <div>
      <p
        style={{
          color: "var(--cream)",
          fontSize: ".78rem",
          fontWeight: 650,
          margin: "0 0 7px",
          overflowWrap: "anywhere",
        }}
      >
        {name}
      </p>
      <div
        role="img"
        aria-label={`${name} element balance: ${CHART_ELEMENTS.map((element) => `${label(element)} ${counts[element]}`).join(", ")}`}
        style={{
          display: "flex",
          height: 42,
          overflow: "hidden",
          borderRadius: 10,
          background: "rgba(255,255,255,.04)",
          border: "1px solid rgba(244,236,219,.12)",
        }}
      >
        {CHART_ELEMENTS.map((element) => {
          const count = counts[element];
          return count > 0 ? (
            <div
              key={element}
              data-element={element}
              style={{
                width: `${total > 0 ? (count / total) * 100 : 25}%`,
                minWidth: 0,
                display: "grid",
                placeItems: "center",
                alignContent: "center",
                color: "#0A0717",
                background: ELEMENT_COLORS[element],
                borderRight: element === "water" ? "none" : "1px solid rgba(10,7,23,.18)",
                fontSize: ".62rem",
                fontWeight: 800,
                lineHeight: 1.1,
                textAlign: "center",
              }}
            >
              <span>{label(element)}</span>
              <span style={{ fontSize: ".72rem" }}>{count}</span>
            </div>
          ) : null;
        })}
      </div>
      <div
        aria-hidden="true"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 5,
          marginTop: 6,
        }}
      >
        {CHART_ELEMENTS.map((element) => (
          <span
            key={element}
            style={{
              color: ELEMENT_COLORS[element],
              fontSize: ".61rem",
              fontWeight: 700,
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            {label(element)} {counts[element]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ElementBalanceSection({
  nameA,
  nameB,
  balance,
}: {
  nameA: string;
  nameB: string;
  balance: PairElementBalance;
}) {
  const interpretation = pairElementBalanceInterpretation(balance);

  return (
    <section className="glass-card fade-in fade-in-delay-2" data-element-balance>
      {/* FOUNDER-REVIEW: element-balance section heading. */}
      <p className="eyebrow" style={{ marginBottom: 12 }}>Element balance</p>
      <div style={{ display: "grid", gap: 14 }}>
        <ElementBar name={nameA} counts={balance.a} />
        <ElementBar name={nameB} counts={balance.b} />
      </div>
      {interpretation.length > 0 ? (
        <div style={{ display: "grid", gap: 5, marginTop: 14 }}>
          {interpretation.map((line) => (
            <p key={line} className="muted" style={{ fontSize: ".8rem", lineHeight: 1.6, margin: 0 }}>
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
