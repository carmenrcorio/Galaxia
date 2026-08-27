import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShareSnapshotView } from "../../../components/share-snapshot-view";
import { getQuickShareByToken } from "../../../lib/quick-share-server";

const BASE_METADATA = {
  title: "Shared reading · Galaxia",
  // Link-preview crawlers (Facebook/Slack/iMessage/etc.) ignore `robots` —
  // they still need the openGraph/twitter tags below to unfurl the link.
  // This stays noindex/nofollow because the actual gate against search
  // engines and crawlers that DO honor it is unchanged: an unguessable
  // token is not a page we want indexed.
  robots: { index: false, follow: false },
} satisfies Metadata;

/**
 * Per-token metadata so a copied `/s/<token>` link unfurls into the
 * matching OG image (app/s/[token]/opengraph-image.tsx renders it from the
 * same stored, already-stripped snapshot). An unknown/forged token still
 * gets a real (fallback-branded) image — the route never 404s the image
 * itself — so this always points at it, even before knowing whether the
 * token resolves.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const snapshot = await getQuickShareByToken(token);
  const imagePath = `/s/${token}/opengraph-image`;
  return {
    ...BASE_METADATA,
    openGraph: {
      title: BASE_METADATA.title,
      description: snapshot?.kind === "compare" ? "A shared compatibility reading." : "A shared birth chart.",
      images: [imagePath],
    },
    twitter: {
      card: "summary_large_image",
      title: BASE_METADATA.title,
      images: [imagePath],
    },
  };
}

/**
 * Public read-only share surface. Outside middleware matcher (no auth gate).
 * Loads one snapshot by unguessable token via service role; unknown/forged → 404.
 * Never recomputes the chart — renders the stored payload only.
 */
export default async function ShareSnapshotPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const snapshot = await getQuickShareByToken(token);
  if (!snapshot) notFound();

  return <ShareSnapshotView kind={snapshot.kind} payload={snapshot.payload} />;
}
