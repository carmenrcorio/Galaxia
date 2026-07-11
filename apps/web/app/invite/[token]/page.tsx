import type { Metadata } from "next";
import { InviteBirthDataForm } from "../../../components/invite-birth-data-form";
import { getInviteByToken } from "../../../lib/invites";

export const metadata: Metadata = {
  title: "Galaxia Invite"
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

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

  // Any invite.kind other than "birth_data" is the deferred, v2 user-to-user
  // "shared space" connect feature — its own creation UI never shipped (no
  // button anywhere makes an invites row with this kind; confirmed zero rows
  // of any kind exist in the live database). This branch used to claim
  // "open this invite in the mobile app to continue," but mobile has no
  // handler for it either — that was a false claim about a real path
  // existing. Say plainly that it isn't available yet instead.
  return (
    <main className="container" style={{ padding: "56px 0", maxWidth: 780 }}>
      <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 42 }}>This invite isn't ready yet</h1>
      <p style={{ color: "var(--mist)", lineHeight: 1.7 }}>
        {invite.inviter_name ?? "Someone you know"} sent you this link, but shared spaces you can join this way aren't available yet — that feature is still being built.
      </p>
      <p style={{ color: "var(--mist2)", marginTop: 16 }}>
        Privacy reminder: this page never shows private notes or detailed chart content.
      </p>
    </main>
  );
}
