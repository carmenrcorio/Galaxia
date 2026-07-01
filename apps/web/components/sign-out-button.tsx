"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [status, setStatus] = useState<string | null>(null);

  const signOut = async () => {
    setStatus(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setStatus("Sign-out failed. Try again.");
      return;
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button type="button" className="pill-link" onClick={signOut}>
        Sign out
      </button>
      {status ? <small className="muted">{status}</small> : null}
    </div>
  );
}
