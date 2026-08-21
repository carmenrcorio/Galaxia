import { NextResponse, type NextRequest } from "next/server";
import { missingEnvMessage, publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { listAdminUsers, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../../../../lib/admin/list-users";
import { requireAdminApi } from "../../../../lib/require-admin";

// Talks to the Supabase Auth Admin API with the service-role key; Node runtime.
export const runtime = "nodejs";

/**
 * GET /api/admin/users — the read-only admin user list, as a real JSON API.
 *
 * This is one of the two proof points for the whole portal's safety: this
 * handler calls requireAdminApi() itself, so a non-admin (or anonymous)
 * caller hitting this URL directly — curl, fetch, anything that skips the
 * `/admin` layout and its requireAdmin() call entirely — still gets denied
 * here. The layout guard alone would not catch that; this one does.
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json(
      { error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE)
  );
  const search = searchParams.get("q") ?? undefined;

  try {
    const result = await listAdminUsers(publicEnv.supabaseUrl, privateEnv.serviceRole, {
      page,
      pageSize,
      search
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Couldn't load users. Please try again." }, { status: 502 });
  }
}
