import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { missingEnvMessage, publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { requireAdminApi } from "../../../../lib/require-admin";
import { createPost, PostSlugConflictError, type PostInput } from "../../../../lib/admin/posts";
import { writeAdminAuditLog } from "../../../../lib/admin/audit-log";
import { BLOG_CATEGORIES } from "../../../../lib/blog";

export const runtime = "nodejs";

/**
 * POST /api/admin/posts — creates a row in `posts`. Guarded by
 * `requireAdminApi()` independent of the `/admin` layout, same
 * defense-in-depth requirement as every `/api/admin/**` handler (see
 * users/route.ts's own doc comment). Delegates the actual validate+insert
 * to `createPost` (lib/admin/posts.ts), then writes exactly one
 * `admin_audit_log` row via the shared `writeAdminAuditLog` — same
 * "audit write happens in the same function as the mutation, and a failed
 * audit write is a 500 even though the mutation already landed" contract
 * every other admin write route in this app follows (see
 * comp/grant/route.ts's own doc comment).
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as Partial<PostInput> | null;
  if (!body || typeof body.title !== "string" || typeof body.body !== "string") {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  const categorySlugs = BLOG_CATEGORIES.map((c) => c.slug);
  if (!categorySlugs.includes(body.category as never)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  const status = body.status === "published" ? "published" : "draft";

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });

  let post;
  try {
    post = await createPost(serviceRoleClient, {
      title: body.title,
      slug: typeof body.slug === "string" ? body.slug : "",
      dek: typeof body.dek === "string" ? body.dek : "",
      category: body.category as PostInput["category"],
      body: body.body,
      heroImageUrl: typeof body.heroImageUrl === "string" ? body.heroImageUrl : null,
      status
    });
  } catch (err) {
    if (err instanceof PostSlugConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Couldn't create the post. Please try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await writeAdminAuditLog(serviceRoleClient, {
      actorId: guard.user.id,
      action: "create_post",
      metadata: { post_id: post.id, slug: post.slug, status: post.status }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit log write failed.";
    return NextResponse.json(
      { error: `Post created, but the audit log write failed: ${message}. Please tell an engineer.` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, post });
}
