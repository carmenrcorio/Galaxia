import { redirect } from "next/navigation";

/**
 * /admin has no content of its own — it exists so the guard in
 * admin/layout.tsx has something to protect at the bare path. The real
 * landing surface is the user list.
 */
export default function AdminIndexPage() {
  redirect("/admin/users");
}
