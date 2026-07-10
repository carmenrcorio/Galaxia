import { NextResponse } from "next/server";

/**
 * Cancel the active subscription — STUB until Part 3 (Stripe).
 *
 * When wired: cancel at period end via the Stripe API / Billing Portal, then the
 * webhook flips `subscription_status` to `canceled`. Access continues until
 * `current_period_end`. One click, no retention offer, no survey-before-button.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Cancellation isn't wired up yet — payments are being connected." },
    { status: 501 }
  );
}
