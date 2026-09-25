import type { NatalChart } from "@galaxia/astro";
import { tokens } from "@galaxia/ui";
import { Text, View } from "react-native";
import { fonts } from "../lib/typography";

export function ChartSignTiles({ chart }: { chart: NatalChart }) {
  const sun = chart.placements.find((p) => p.body === "sun");
  const moon = chart.placements.find((p) => p.body === "moon");
  const tiles: { key: string; label: string; sign: string }[] = [];

  if (sun?.sign) tiles.push({ key: "sun", label: "Sun", sign: sun.sign });
  if (moon?.sign) tiles.push({ key: "moon", label: "Moon", sign: moon.sign });
  if (chart.asc) tiles.push({ key: "rising", label: "Rising", sign: chart.asc });

  if (tiles.length === 0) return null;

  return (
    <View testID="chart-sign-tiles" style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
      {tiles.map((tile) => (
        <View
          key={tile.key}
          style={{
            flex: 1,
            minHeight: 88,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            backgroundColor: "rgba(10,7,24,0.55)",
            paddingHorizontal: 8,
            paddingVertical: 12,
            justifyContent: "center",
            alignItems: "center",
            gap: 4
          }}
        >
          <Text style={{ color: tokens.colors.mist2, fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase" }}>
            {tile.label}
          </Text>
          <Text style={{ color: tokens.colors.cream, fontFamily: fonts.fraunces, fontSize: 16 }}>
            {tile.sign}
          </Text>
        </View>
      ))}
    </View>
  );
}
