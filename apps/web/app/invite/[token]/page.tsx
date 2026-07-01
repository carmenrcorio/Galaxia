import type { Metadata } from "next";
import { SmartAppBanner } from "../../../components/smart-app-banner";
import { publicEnv } from "../../../lib/env";
import { getInviteByToken } from "../../../lib/invites";

export const metadata: Metadata = {
  title: "Galaxia Invite"
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);
  const siteUrl = publicEnv.siteUrl || "";
  const deepLink = `${siteUrl}/invite/${token}`;

  if (!invite) {
    return (
      <main className="container" style={{ padding: "56px 0", maxWidth: 780 }}>
        <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 42 }}>Invite not found</h1>
        <p style={{ color: "var(--mist)" }}>This invite token is invalid, expired, or revoked.</p>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: "56px 0", maxWidth: 780 }}>
      <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 42 }}>You were invited to Galaxia</h1>
      <p style={{ color: "var(--mist)", lineHeight: 1.7 }}>
        {invite.inviter_name ?? "Someone you know"} invited you to a {invite.relationship_type ?? "shared"} space. Status: {invite.status}. Open this invite in the mobile app to continue.
      </p>
      <SmartAppBanner deepLink={deepLink} />
      <p style={{ color: "var(--mist2)", marginTop: 16 }}>
        Privacy reminder: this page never shows private notes or detailed chart content.
      </p>
    </main>
  );
}
