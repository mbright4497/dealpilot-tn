"use client";

import React, { useState } from "react";
import { passwordResetCallbackRedirectTo } from "@/lib/auth-constants";
import { createBrowserClient } from "@/lib/supabase-browser";

export default function ForgotPassword() {
  const supabase = createBrowserClient();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const redirectTo = passwordResetCallbackRedirectTo();
      const isHttps = window.location.protocol === "https:";
      // Backup if Supabase omits `next` on redirect; keep long enough for email delay.
      document.cookie = `dp_auth_flow=reset; path=/; max-age=86400; samesite=lax;${isHttps ? " secure;" : ""}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) setErr(error.message);
      else setMsg("Check your email for password reset instructions");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-xl">
        <div className="mb-6">
          <p className="text-sm text-white/60">ClosingPilot TN</p>
          <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        </div>
        <form onSubmit={handle} className="space-y-3">
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
          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-xl bg-[#F97316] py-2.5 text-sm font-medium text-white hover:bg-[#ea580c] disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset email"}
          </button>
          {msg && <div className="text-sm text-emerald-300">{msg}</div>}
          {err && <div className="text-sm text-red-400">{err}</div>}
        </form>
        <div className="mt-4 text-sm text-white/60">
          Remembered?{" "}
          <a href="/login" className="text-orange-400 hover:text-orange-300">
            Log in
          </a>
        </div>
      </div>
    </div>
  );
}
