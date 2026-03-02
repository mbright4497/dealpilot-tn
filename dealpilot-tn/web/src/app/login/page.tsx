"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const errorParam = searchParams.get("error");
  useEffect(() => {
    if (errorParam) setMsg(decodeURIComponent(errorParam));
  }, [errorParam]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/");
    })();
  }, [router, supabase]);

  async function onEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    router.replace("/");
  }

  async function onGoogleLogin() {
    setBusy(true);
    setMsg(null);
    const redirectTo = `${window.location.origin}/api/auth/callback?next=/`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setBusy(false);
      setMsg(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-xl">
        <div className="mb-6">
          <p className="text-sm text-white/60">DealPilot TN</p>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-white/70">Log in to access your deals, deadlines, and Mission Control.</p>
        </div>

        {msg && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{msg}</div>}

        <button onClick={onGoogleLogin} disabled={busy} className="w-full rounded-xl bg-white text-black font-medium py-2.5 hover:bg-white/90 disabled:opacity-60">Continue with Google</button>

        <div className="my-5 flex items-center gap-3"><div className="h-px flex-1 bg-white/10" /><span className="text-xs text-white/50">or</span><div className="h-px flex-1 bg-white/10" /></div>

        <form onSubmit={onEmailLogin} className="space-y-3">
          <div><label className="block text-xs text-white/60 mb-1">Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className="w-full rounded-xl bg-[#0F1526] border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25" placeholder="you@brokerage.com" required /></div>
          <div><label className="block text-xs text-white/60 mb-1">Password</label><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" className="w-full rounded-xl bg-[#0F1526] border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25" placeholder="••••••••" required /></div>
          <button disabled={busy} className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-60" type="submit">Sign in with Email</button>
        </form>
      </div>
    </div>
  );
}
