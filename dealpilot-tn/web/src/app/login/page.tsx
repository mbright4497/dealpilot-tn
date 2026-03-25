"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase-browser";
import { DASHBOARD_PATH, googleOAuthRedirectTo } from "@/lib/auth-constants";
import { friendlyAuthMessage } from "@/lib/auth-errors";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sessionProbeError, setSessionProbeError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err) setMsg(friendlyAuthMessage(err));
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (cancelled) return;
        if (error) {
          setSessionProbeError(friendlyAuthMessage(error));
          return;
        }
        if (data.user) {
          router.replace(DASHBOARD_PATH);
        }
      } catch (e) {
        if (!cancelled) {
          setSessionProbeError(
            e instanceof Error
              ? e.message
              : "Could not verify session. You can still sign in."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  async function onEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) {
      setMsg(friendlyAuthMessage(error));
      return;
    }

    (async () => {
      try {
        const p = await fetch("/api/profile");
        if (p.ok) {
          const j = await p.json();
          const last = j?.last_ghl_sync ? new Date(j.last_ghl_sync).getTime() : 0;
          const now = Date.now();
          if (!last || now - last > 1000 * 60 * 60) {
            fetch("/api/ghl/contacts/sync", { method: "POST" }).catch(() => {});
          }
        }
      } catch {}
    })();

    router.replace(DASHBOARD_PATH);
  }

  async function onGoogleLogin() {
    setBusy(true);
    setMsg(null);
    const redirectTo = googleOAuthRedirectTo("/chat");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    setBusy(false);
    if (error) setMsg(friendlyAuthMessage(error));
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-xl">
        <div className="mb-6">
          <p className="text-sm text-white/60">ClosingPilot TN</p>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-white/70">
            Log in to access your deals, deadlines, and Mission Control.
          </p>
        </div>

        {msg && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {msg}
          </div>
        )}

        {sessionProbeError && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {sessionProbeError}
          </div>
        )}

        <button
          type="button"
          onClick={() => void onGoogleLogin()}
          disabled={busy}
          className="w-full rounded-xl bg-white text-black font-medium py-2.5 hover:bg-white/90 disabled:opacity-60"
        >
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/50">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={onEmailLogin} className="space-y-3">
          <div>
            <label className="block text-xs text-white/60 mb-1">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="w-full rounded-xl bg-[#0F1526] border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25"
              placeholder="you@brokerage.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl bg-[#0F1526] border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25"
              placeholder="- - - - - - - - "
              required
            />
          </div>
          <button
            disabled={busy}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-60"
            type="submit"
          >
            Sign in with Email
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <a href="/forgot-password" className="text-white/60 hover:text-orange-400">
            Forgot password?
          </a>
          <a href="/signup" className="text-white/60 hover:text-orange-400">
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
}
