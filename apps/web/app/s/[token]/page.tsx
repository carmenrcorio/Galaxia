import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShareSnapshotView } from "../../../components/share-snapshot-view";
import { getQuickShareByToken } from "../../../lib/quick-share-server";

export const metadata: Metadata = {
  title: "Shared reading · Galaxia",
  robots: { index: false, follow: false },
};

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
