import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { missingEnvMessage, publicEnv } from "../../../../../lib/env";
import { privateEnv } from "../../../../../lib/env.server";
import { requireAdminApi } from "../../../../../lib/require-admin";
import {
  deletePost,
  PostNotFoundError,
  PostSlugConflictError,
  updatePost,
  type PostInput
} from "../../../../../lib/admin/posts";
import { writeAdminAuditLog } from "../../../../../lib/admin/audit-log";
import { BLOG_CATEGORIES } from "../../../../../lib/blog";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/posts/[id] — updates a `posts` row. DELETE removes it.
 * Both guarded by `requireAdminApi()` (independent of the `/admin` layout,
 * same defense-in-depth every `/api/admin/**` handler needs) and both write
 * exactly one `admin_audit_log` row after the mutation succeeds, same
 * "audit failure is a 500, the mutation already happened" contract as
 * `posts/route.ts`'s create handler.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") }, { status: 500 });
  }

  const { id } = await params;
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
    post = await updatePost(serviceRoleClient, id, {
      title: body.title,
      slug: typeof body.slug === "string" ? body.slug : "",
      dek: typeof body.dek === "string" ? body.dek : "",
      category: body.category as PostInput["category"],
      body: body.body,
      heroImageUrl: typeof body.heroImageUrl === "string" ? body.heroImageUrl : null,
      status
    });
  } catch (err) {
    if (err instanceof PostNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof PostSlugConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Couldn't update the post. Please try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await writeAdminAuditLog(serviceRoleClient, {
      actorId: guard.user.id,
      action: "update_post",
      metadata: { post_id: post.id, slug: post.slug, status: post.status }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit log write failed.";
    return NextResponse.json(
      { error: `Post updated, but the audit log write failed: ${message}. Please tell an engineer.` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, post });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") }, { status: 500 });
  }

  const { id } = await params;
  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });

  try {
    await deletePost(serviceRoleClient, id);
  } catch (err) {
    if (err instanceof PostNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : "Couldn't delete the post. Please try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await writeAdminAuditLog(serviceRoleClient, {
      actorId: guard.user.id,
      action: "delete_post",
      metadata: { post_id: id }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit log write failed.";
    return NextResponse.json(
      { error: `Post deleted, but the audit log write failed: ${message}. Please tell an engineer.` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
