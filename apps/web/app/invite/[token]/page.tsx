import type { Metadata } from "next";
import { InviteBirthDataForm } from "../../../components/invite-birth-data-form";
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

  // ── Birth-data request (E3): the invited person fills in their own details ──
  if (invite.kind === "birth_data") {
    const inviter = invite.inviter_name ?? "Someone you know";
    const alreadyDone = invite.status === "accepted";
    return (
      <main className="container" style={{ padding: "56px 0", maxWidth: 640 }}>
        <p className="eyebrow">A gentle ask</p>
        <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 38, marginTop: 4 }}>
          {inviter} would love your birth details
        </h1>
        <p style={{ color: "var(--mist)", lineHeight: 1.7 }}>
          {inviter} uses Galaxia to understand the people they care about through astrology. Adding your birth
          date — and your exact time and city, if you know them — lets them see your chart and how the two of you
          connect. It takes about 30 seconds.
        </p>
        {alreadyDone ? (
          <div className="glass-card" style={{ marginTop: 20 }}>
            <p style={{ color: "var(--gold)" }}>✦ You've already shared your details. Thank you!</p>
          </div>
        ) : (
          <InviteBirthDataForm token={token} personName={invite.person_name ?? "you"} inviterName={inviter} />
        )}
        <p style={{ color: "var(--mist2)", marginTop: 16, fontSize: ".8rem" }}>
          Privacy: this page only collects your birth details. You will never see anyone's private notes or charts.
        </p>
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
