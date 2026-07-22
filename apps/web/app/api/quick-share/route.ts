import { NextResponse } from "next/server";
import { validateQuickSharePersistBody } from "../../../lib/quick-share";
import { insertQuickShareSnapshot } from "../../../lib/quick-share-server";

/**
 * Persist a Quick Chart / Quick Compare reading as a tokenized snapshot.
 * Public POST — no auth. Returns { token } for /s/<token>.
 *
 * STRUCTURAL GUARANTEE: compare + pairHasMinor + romantic → 400, no insert.
 * Payload is sanitized to display fields + computed engine output only
 * (no exact birth time, lat/lng, or tzOffsetMin).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const validated = validateQuickSharePersistBody(body);
  if (validated.ok === false) {
    return NextResponse.json({ error: validated.error }, { status: validated.status });
  }

  try {
    const { token } = await insertQuickShareSnapshot(validated.kind, validated.payload);
    return NextResponse.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create share link.";
    // missingEnvMessage names the variable; other DB errors stay readable.
    const status = message.includes("is not configured") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
