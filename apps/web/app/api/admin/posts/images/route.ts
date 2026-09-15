import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { missingEnvMessage, publicEnv } from "../../../../../lib/env";
import { privateEnv } from "../../../../../lib/env.server";
import { requireAdminApi } from "../../../../../lib/require-admin";
import {
  InvalidPostImageError,
  listBlogImages,
  uploadPostImage
} from "../../../../../lib/admin/post-images";

export const runtime = "nodejs";

/**
 * GET /api/admin/posts/images — lists every file in the `blog-images`
 * Storage bucket (root SVG heroes plus `photos/`). POST uploads one raster
 * photo to `blog-images/photos/` and returns its public URL. Used by the
 * hero-image chooser and the body editor's "Insert image after" picker in
 * `components/admin/post-editor-form.tsx`.
 *
 * Guarded by `requireAdminApi()`, same as every `/api/admin/**` handler.
 * Does not write to `admin_audit_log` — an upload with no post attached
 * yet has nothing to log against; the save itself (create_post/update_post)
 * is what's audited, and its metadata already includes the resulting
 * `hero_image_url`/body.
 */
export async function GET() {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") }, { status: 500 });
  }

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });

  try {
    const images = await listBlogImages(serviceRoleClient);
    return NextResponse.json({ images });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't list images. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") }, { status: 500 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file was provided." }, { status: 400 });
  }

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });

  try {
    const { url, path } = await uploadPostImage(serviceRoleClient, file);
    return NextResponse.json({ ok: true, url, path });
  } catch (err) {
    if (err instanceof InvalidPostImageError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Couldn't upload the image. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
