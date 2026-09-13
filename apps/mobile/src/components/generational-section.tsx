/**
 * Native Generational call-out for Compare. Same information as web's
 * GenerationalSection: mix-selected headline, shared placements, and one
 * nested card per diverged planet (domain, watch-for, You:/Them: proof).
 * Lookup only; never re-derives placements.
 */

import { tokens } from "@galaxia/ui";
import { Text, View } from "react-native";
import {
  buildGenerationalCallout,
  type GenerationalCalloutData
} from "../lib/generational-callout";

type Props = {
  generational: GenerationalCalloutData;
};

export function GenerationalSection({ generational }: Props) {
  const model = buildGenerationalCallout(generational);

  return (
    <View style={cardStyle}>
      <Text style={cardTitle}>Generational call-out</Text>
      <Text style={cardBody}>{model.headline}</Text>

      {model.shared.map((card) => (
        <View key={card.key} style={nestedCard}>
          <Text style={creamBody}>{card.essence}</Text>
          {card.guidance ? <Text style={cardBody}>{card.guidance}</Text> : null}
          <Text style={proofStyle}>{card.proof}</Text>
        </View>
      ))}

      {model.diverged.map((card) => (
        <View key={card.key} style={divergedCard}>
          <Text style={domainStyle}>{card.domain}</Text>
          <Text style={creamBody}>{card.watchFor}</Text>
          <Text style={proofStyle}>{card.proof}</Text>
        </View>
      ))}
    </View>
  );
}

const cardStyle = {
  backgroundColor: tokens.colors.ink3,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: tokens.colors.line,
  padding: 12,
  gap: 8
} as const;

const cardTitle = {
  color: tokens.colors.cream,
  fontWeight: "700",
  fontSize: 18
} as const;

const cardBody = {
  color: tokens.colors.mist,
  lineHeight: 20
} as const;

const creamBody = {
  color: tokens.colors.cream,
  lineHeight: 20
} as const;

const nestedCard = {
  borderRadius: 10,
  borderWidth: 1,
  borderColor: tokens.colors.line,
  padding: 10,
  gap: 4
} as const;

const divergedCard = {
  borderRadius: 10,
  borderWidth: 1,
  borderColor: tokens.colors.line,
  borderLeftWidth: 2,
  borderLeftColor: tokens.colors.teal,
  padding: 10,
  gap: 4
} as const;

const domainStyle = {
  color: tokens.colors.mist2,
  fontSize: 12,
  lineHeight: 18
} as const;

const proofStyle = {
  color: tokens.colors.mist2,
  fontSize: 12,
  lineHeight: 18,
  marginTop: 2
} as const;
