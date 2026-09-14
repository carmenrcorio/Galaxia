import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ConnectAcceptView } from "../../../components/connect-accept-view";
import { isConnectToken } from "../../../lib/connect-invite";
import { getConnectInviteLanding } from "../../../lib/connect-invite-server";

export const metadata: Metadata = {
  title: "Connect · Galaxia",
  robots: { index: false, follow: false },
};

export default async function ConnectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isConnectToken(token)) notFound();

  const landing = await getConnectInviteLanding(token);
  if (landing === "wrong_kind") {
    // Type-only: dynamic /invite/[token]; typedRoutes wants RouteImpl.
    permanentRedirect(`/invite/${token}` as never);
  }
  if (landing === "not_found") notFound();

  return <ConnectAcceptView token={token} landing={landing === "unconfigured" ? null : landing} />;
}
