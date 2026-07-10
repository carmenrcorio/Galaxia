import { NextResponse } from "next/server";

/**
 * Stripe Checkout session creation — STUB until Part 3.
 *
 * Card-optional trial (Amendment 1): there is no Checkout at signup. This route
 * is called at trial end or when the user chooses to subscribe. When wired, it
 * will create a Checkout Session for the chosen price with NO trial_period_days
 * (the trial is tracked in our own database, not Stripe's).
 */
export async function POST() {
  return NextResponse.json(
    { error: "Checkout isn't available yet — payments are being wired up." },
    { status: 501 }
  );
}
