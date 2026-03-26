"use client";

import * as React from "react";
import { createBrowserClient } from "@/lib/supabase-browser";

type ProfilePayload = {
  full_name?: string | null;
  brokerage?: string | null;
};

function initialsFromDisplay(displayName: string, email: string | null): string {
  const t = displayName.trim();
  if (t) {
    const parts = t.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0][0];
      const b = parts[parts.length - 1][0];
      if (a && b) return (a + b).toUpperCase();
    }
    return t.slice(0, 2).toUpperCase();
  }
  if (email) {
    const local = email.split("@")[0] ?? "";
    return local.slice(0, 2).toUpperCase() || "?";
  }
  return "?";
}

export type SidebarProfileState = {
  loading: boolean;
  displayName: string;
  brokerage: string;
  initials: string;
};

export function useSidebarProfile(): SidebarProfileState {
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const [state, setState] = React.useState<SidebarProfileState>({
    loading: true,
    displayName: "",
    brokerage: "",
    initials: "…",
  });

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [{ data: authData }, profileRes] = await Promise.all([
          supabase.auth.getUser(),
          fetch("/api/profile"),
        ]);

        if (!mounted) return;

        const user = authData.user;
        const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
        const metaName = (meta?.full_name || meta?.name || "").trim() || null;
        const email = user?.email ?? null;

        let profile: ProfilePayload | null = null;
        if (profileRes.ok) {
          const j = (await profileRes.json().catch(() => ({}))) as { profile?: ProfilePayload | null };
          profile = j?.profile ?? null;
        }

        const fromProfileName = (profile?.full_name ?? "").trim();
        const displayName =
          fromProfileName || metaName || (email ? email.split("@")[0]! : "Account");

        const brokerage = (profile?.brokerage ?? "").trim();

        setState({
          loading: false,
          displayName,
          brokerage,
          initials: initialsFromDisplay(displayName, email),
        });
      } catch {
        if (!mounted) return;
        setState({
          loading: false,
          displayName: "Account",
          brokerage: "",
          initials: "?",
        });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  return state;
}
