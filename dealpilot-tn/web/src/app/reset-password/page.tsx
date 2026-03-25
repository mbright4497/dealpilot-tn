"use client"
import React, { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function ResetPassword(){
  const supabase = useMemo(() => createBrowserClient(), [])
  const router = useRouter()
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [msg,setMsg]=useState<string|null>(null)
  const [err,setErr]=useState<string|null>(null)
  const [loading,setLoading]=useState(false)
  const [sessionReady,setSessionReady]=useState(false)

  useEffect(()=>{
    let cancelled = false
    ;(async () => {
      // Legacy / misconfigured links: Supabase may still redirect here with ?code= (PKCE).
      const params = new URLSearchParams(window.location.search)
      const code = params.get("code")
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled) return
        if (error) {
          setErr(error.message)
          setSessionReady(true)
          return
        }
        router.replace("/reset-password", { scroll: false })
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session) {
        setErr("This reset link is invalid or has expired. Request a new one from Forgot password.")
      }
      setSessionReady(true)
    })()
    return () => { cancelled = true }
  },[router, supabase])

  const handle = async (e:React.FormEvent)=>{
    e.preventDefault()
    setErr(null); setMsg(null)
    if(password !== confirm){ setErr('Passwords do not match'); return }
    setLoading(true)
    try{
      const { error } = await supabase.auth.updateUser({ password })
      if(error) setErr(error.message)
      else { setMsg('Password updated. Redirecting to login...'); setTimeout(()=>router.push('/login'),1500) }
    }catch(e: unknown){ setErr(e instanceof Error ? e.message : String(e)) }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A]">
      <div className="w-full max-w-md p-6 rounded-2xl bg-gray-900 text-white">
        <h2 className="text-2xl font-bold mb-4">Set a new password</h2>
        {!sessionReady && (
          <p className="text-sm text-gray-400 mb-4">Checking your session…</p>
        )}
        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="text-sm text-gray-300">New password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full mt-1 p-2 rounded bg-gray-800 text-white border border-gray-700" disabled={!sessionReady} />
          </div>
          <div>
            <label className="text-sm text-gray-300">Confirm password</label>
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required className="w-full mt-1 p-2 rounded bg-gray-800 text-white border border-gray-700" disabled={!sessionReady} />
          </div>
          <div>
            <button disabled={loading || !sessionReady} type="submit" className="w-full py-2 rounded bg-[#F97316] text-white font-semibold disabled:opacity-50">{loading? 'Saving...' : 'Save password'}</button>
          </div>
          {msg && <div className="text-sm text-emerald-300">{msg}</div>}
          {err && <div className="text-sm text-red-400">{err}</div>}
        </form>
      </div>
    </div>
  )
}
