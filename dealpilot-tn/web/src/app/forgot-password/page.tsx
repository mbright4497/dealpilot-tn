"use client"
import React, { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'

export default function ForgotPassword(){
  const supabase = createBrowserClient()
  const [email,setEmail]=useState('')
  const [msg,setMsg]=useState<string|null>(null)
  const [err,setErr]=useState<string|null>(null)
  const [loading,setLoading]=useState(false)

  const handle = async (e:React.FormEvent)=>{
    e.preventDefault()
    setErr(null); setMsg(null)
    setLoading(true)
    try{
      // PKCE recovery: must hit the callback route so `exchangeCodeForSession` runs (same as OAuth).
      const redirectTo = `${window.location.origin}/api/auth/callback`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if(error) setErr(error.message)
      else setMsg('Check your email for password reset instructions')
    }catch(e: unknown){ setErr(e instanceof Error ? e.message : String(e)) }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A]">
      <div className="w-full max-w-md p-6 rounded-2xl bg-gray-900 text-white">
        <h2 className="text-2xl font-bold mb-4">Reset your password</h2>
        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="text-sm text-gray-300">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full mt-1 p-2 rounded bg-gray-800 text-white border border-gray-700" />
          </div>
          <div>
            <button disabled={loading} type="submit" className="w-full py-2 rounded bg-[#F97316] text-white font-semibold">{loading? 'Sending...' : 'Send reset email'}</button>
          </div>
          {msg && <div className="text-sm text-emerald-300">{msg}</div>}
          {err && <div className="text-sm text-red-400">{err}</div>}
        </form>
        <div className="mt-4 text-sm text-gray-300">Remembered? <a href="/login" className="text-orange-400">Log in</a></div>
      </div>
    </div>
  )
}
