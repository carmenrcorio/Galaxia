import { NextResponse } from "next/server";
import {
  parseExpiresInDays,
  validateQuickSharePersistBody,
} from "../../../lib/quick-share";
import {
  insertQuickShareSnapshot,
  listQuickSharesByCreator,
} from "../../../lib/quick-share-server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

async function sessionUserId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Persist a Quick Chart / Quick Compare reading as a tokenized snapshot.
 * Public POST — auth optional. Returns { token } for /s/<token>.
 * When a session exists, created_by is set so account deletion and Settings
 * revoke can clear the link. Anonymous inserts stay created_by NULL.
 *
 * STRUCTURAL GUARANTEE: compare + pairHasMinor + romantic → 400, no insert.
 * Payload is sanitized to display fields + computed engine output
 * (no exact birth time, lat/lng, or tzOffsetMin on the chart). Gift natal
 * shares may include an allowlisted giftBirth envelope for the return path.
 *
 * expiresInDays: 7 | 14 | 30 | null. Default 14. Anonymous cannot pick
 * "no expiry" (coerced to 14) because they cannot revoke later.
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

  const createdBy = await sessionUserId();
  const expiresRaw =
    body && typeof body === "object" && "expiresInDays" in body
      ? (body as { expiresInDays?: unknown }).expiresInDays
      : undefined;
  const expires = parseExpiresInDays(expiresRaw, Boolean(createdBy));
  if (expires.ok === false) {
    return NextResponse.json({ error: expires.error }, { status: 400 });
  }

  try {
    const { token } = await insertQuickShareSnapshot(
      validated.kind,
      validated.payload,
      createdBy,
      expires.days,
    );
    return NextResponse.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create share link.";
    // missingEnvMessage names the variable; other DB errors stay readable.
    const status = message.includes("is not configured") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * List the caller's live share links. Auth required. Never returns giftBirth.
 */
export async function GET() {
  const userId = await sessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to manage share links." }, { status: 401 });
  }
  try {
    const shares = await listQuickSharesByCreator(userId);
    return NextResponse.json({ shares });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load share links.";
    const status = message.includes("is not configured") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
