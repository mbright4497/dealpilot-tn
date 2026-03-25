"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase-browser";
import { DASHBOARD_PATH, googleOAuthRedirectTo } from "@/lib/auth-constants";
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
    const redirectTo = googleOAuthRedirectTo("/onboarding");
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
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A]">
      <div className="w-full max-w-md p-6 rounded-2xl bg-gray-900 text-white">
        <h2 className="text-2xl font-bold mb-4">Create account</h2>

        <button
          type="button"
          onClick={() => void onGoogleSignup()}
          disabled={loading}
          className="w-full rounded-xl bg-white text-black font-medium py-2.5 hover:bg-white/90 mb-4 disabled:opacity-60"
        >
          Continue with Google
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-300">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full mt-1 p-2 rounded bg-gray-800 text-white border border-gray-700"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full mt-1 p-2 rounded bg-gray-800 text-white border border-gray-700"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full mt-1 p-2 rounded bg-gray-800 text-white border border-gray-700"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full mt-1 p-2 rounded bg-gray-800 text-white border border-gray-700"
            />
          </div>
          <div>
            <button
              disabled={loading}
              type="submit"
              className="w-full py-2 rounded bg-[#F97316] text-white font-semibold"
            >
              {loading ? "Creating..." : "Create account"}
            </button>
          </div>
          {message && <div className="text-sm text-emerald-300">{message}</div>}
          {error && <div className="text-sm text-red-400">{error}</div>}
        </form>
        <div className="mt-4 text-sm text-gray-300">
          Already have an account?{" "}
          <Link href="/login" className="text-orange-400">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
