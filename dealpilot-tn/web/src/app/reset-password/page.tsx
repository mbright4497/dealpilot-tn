"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createBrowserClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function ResetPassword() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setErr(error.message);
          setSessionReady(true);
          return;
        }
        router.replace("/reset-password", { scroll: false });
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        setErr("This reset link is invalid or has expired. Request a new one from Forgot password.");
      }
      setSessionReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (password !== confirm) {
      setErr("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setErr(error.message);
      else {
        setMsg("Password updated. Redirecting to login...");
        setTimeout(() => router.push("/login"), 1500);
      }
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
          <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        </div>
        {!sessionReady && <p className="text-sm text-white/60 mb-4">Checking your session…</p>}
        <form onSubmit={handle} className="space-y-3">
          <div>
            <label className="block text-xs text-white/60 mb-1">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={!sessionReady}
              className="w-full rounded-xl bg-[#0F1526] border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={!sessionReady}
              className="w-full rounded-xl bg-[#0F1526] border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25 disabled:opacity-50"
            />
          </div>
          <button
            disabled={loading || !sessionReady}
            type="submit"
            className="w-full rounded-xl bg-[#F97316] py-2.5 text-sm font-medium text-white hover:bg-[#ea580c] disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save password"}
          </button>
          {msg && <div className="text-sm text-emerald-300">{msg}</div>}
          {err && <div className="text-sm text-red-400">{err}</div>}
        </form>
      </div>
    </div>
  );
}
