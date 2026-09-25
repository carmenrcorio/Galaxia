import {
  interpretPlacement,
  interpretRising,
  type BodyKey,
  type NatalChart,
  type SignKey
} from "@galaxia/astro";
import { tokens } from "@galaxia/ui";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { fonts } from "../lib/typography";

export function ChartSignTiles({
  chart,
  minorSafe = true
}: {
  chart: NatalChart;
  minorSafe?: boolean;
}) {
  const sun = chart.placements.find((p) => p.body === "sun");
  const moon = chart.placements.find((p) => p.body === "moon");
  const tiles: { key: string; label: string; sign: string; short: string; long: string }[] = [];

  if (sun?.sign && sun.confident !== false) {
    const reading = interpretPlacement("sun" as BodyKey, sun.sign as SignKey, { minorSafe });
    tiles.push({ key: "sun", label: "Sun", sign: sun.sign, short: reading.short, long: reading.long });
  }
  if (moon?.sign && moon.confident !== false) {
    const reading = interpretPlacement("moon" as BodyKey, moon.sign as SignKey, { minorSafe });
    tiles.push({ key: "moon", label: "Moon", sign: moon.sign, short: reading.short, long: reading.long });
  }
  if (chart.asc) {
    const reading = interpretRising(chart.asc as SignKey);
    tiles.push({ key: "rising", label: "Rising", sign: chart.asc, short: reading.short, long: reading.long });
  }

  if (tiles.length === 0) return null;

  return (
    <View testID="chart-sign-tiles" style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
      {tiles.map((tile) => (
        <MobileSignTile key={tile.key} tile={tile} />
      ))}
    </View>
  );
}

function MobileSignTile({
  tile
}: {
  tile: { key: string; label: string; sign: string; short: string; long: string };
}) {
  const [flipped, setFlipped] = useState(false);
  const summary = tile.long || tile.short;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: flipped }}
      accessibilityLabel={
        flipped
          ? `${tile.label} in ${tile.sign}. ${summary}`
          : `${tile.label} in ${tile.sign}. Flip for what this means in the chart.`
      }
      onPress={() => setFlipped((prev) => !prev)}
      style={{
        flex: 1,
        minHeight: 132,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(10,7,24,0.55)",
        paddingHorizontal: 8,
        paddingVertical: 12,
        justifyContent: "center"
      }}
    >
      {flipped ? (
        <View style={{ gap: 6 }}>
          <Text style={{ color: tokens.colors.mist2, fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase", textAlign: "center" }}>
            {tile.label} in {tile.sign}
          </Text>
          {tile.short ? (
            <Text style={{ color: tokens.colors.cream, fontFamily: fonts.fraunces, fontSize: 13, fontStyle: "italic", textAlign: "center" }}>
              {tile.short}
            </Text>
          ) : null}
          {tile.long ? (
            <Text style={{ color: tokens.colors.mist, fontSize: 12, lineHeight: 17, textAlign: "center" }}>
              {tile.long}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text style={{ color: tokens.colors.mist2, fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase" }}>
            {tile.label}
          </Text>
          <Text style={{ color: tokens.colors.cream, fontFamily: fonts.fraunces, fontSize: 16 }}>
            {tile.sign}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
