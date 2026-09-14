import { NextResponse } from "next/server";
import { getQuickShareByToken, revokeQuickShare } from "../../../../lib/quick-share-server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

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
 * Public lookup by unguessable token. Unknown, expired, and revoked tokens
 * all 404 so a probe cannot tell them apart. Used by /chart/compare?gift=.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const snapshot = await getQuickShareByToken(token);
  if (!snapshot) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({
    kind: snapshot.kind,
    payload: snapshot.payload,
    created_at: snapshot.created_at,
    expires_at: snapshot.expires_at,
  });
}

/**
 * Creator revoke. Auth required; only the row's created_by can revoke.
 * Unknown-to-this-user tokens 404 (same as unknown tokens).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const userId = await sessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to revoke a share link." }, { status: 401 });
  }
  const { token } = await params;
  try {
    const ok = await revokeQuickShare(token, userId);
    if (!ok) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not revoke that share link.";
    const status = message.includes("is not configured") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
