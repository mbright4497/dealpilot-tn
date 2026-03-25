"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase-browser";
import { DASHBOARD_PATH, oauthRedirectTo } from "@/lib/auth-constants";
import { friendlyAuthMessage } from "@/lib/auth-errors";

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace(DASHBOARD_PATH);
    })();
  }, [router, supabase]);

  async function onGoogleSignup() {
    setLoading(true);
    setError(null);
    const redirectTo = oauthRedirectTo("/onboarding");
    const { error: oAuthErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    setLoading(false);
    if (oAuthErr) setError(friendlyAuthMessage(oAuthErr));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });
      if (signErr) {
        setError(friendlyAuthMessage(signErr));
        setLoading(false);
        return;
      }
      if (data.session) {
        router.replace(DASHBOARD_PATH);
        return;
      }
      if (data.user) {
        setMessage(
          "Account created. Check your email to confirm and sign in, or contact your admin if you expected to be signed in immediately."
        );
      }
    } catch (e: unknown) {
      setError(friendlyAuthMessage(e instanceof Error ? e : String(e)));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-xl">
        <div className="mb-6">
          <p className="text-sm text-white/60">ClosingPilot TN</p>
          <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        </div>

        <button
          type="button"
          onClick={() => void onGoogleSignup()}
          disabled={loading}
          className="w-full rounded-xl bg-white text-black font-medium py-2.5 hover:bg-white/90 mb-5 disabled:opacity-60"
        >
          Continue with Google
        </button>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-white/60 mb-1">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl bg-[#0F1526] border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25"
            />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl bg-[#0F1526] border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25"
            />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl bg-[#0F1526] border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25"
            />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full rounded-xl bg-[#0F1526] border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25"
            />
          </div>
          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-xl bg-[#F97316] py-2.5 text-sm font-medium text-white hover:bg-[#ea580c] disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
          {message && <div className="text-sm text-emerald-300">{message}</div>}
          {error && <div className="text-sm text-red-400">{error}</div>}
        </form>
        <div className="mt-4 text-sm text-white/60">
          Already have an account?{" "}
          <Link href="/login" className="text-orange-400 hover:text-orange-300">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
