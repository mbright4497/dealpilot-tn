"use client"
import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function ResetPassword(){
  const supabase = createBrowserClient()
  const router = useRouter()
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [msg,setMsg]=useState<string|null>(null)
  const [err,setErr]=useState<string|null>(null)
  const [loading,setLoading]=useState(false)

  useEffect(()=>{
    // could validate magic link params if needed
  },[])

  const handle = async (e:React.FormEvent)=>{
    e.preventDefault()
    setErr(null); setMsg(null)
    if(password !== confirm){ setErr('Passwords do not match'); return }
    setLoading(true)
    try{
      const { error } = await supabase.auth.updateUser({ password })
      if(error) setErr(error.message)
      else { setMsg('Password updated. Redirecting to login...'); setTimeout(()=>router.push('/login'),1500) }
    }catch(e:any){ setErr(String(e)) }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A]">
      <div className="w-full max-w-md p-6 rounded-2xl bg-gray-900 text-white">
        <h2 className="text-2xl font-bold mb-4">Set a new password</h2>
        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="text-sm text-gray-300">New password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full mt-1 p-2 rounded bg-gray-800 text-white border border-gray-700" />
          </div>
          <div>
            <label className="text-sm text-gray-300">Confirm password</label>
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required className="w-full mt-1 p-2 rounded bg-gray-800 text-white border border-gray-700" />
          </div>
          <div>
            <button disabled={loading} type="submit" className="w-full py-2 rounded bg-[#F97316] text-white font-semibold">{loading? 'Saving...' : 'Save password'}</button>
          </div>
          {msg && <div className="text-sm text-emerald-300">{msg}</div>}
          {err && <div className="text-sm text-red-400">{err}</div>}
        </form>
      </div>
    </div>
  )
}
