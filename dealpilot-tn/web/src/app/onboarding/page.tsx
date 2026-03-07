'use client'
import React, { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'
import PersonalitySelector from '@/components/PersonalitySelector'
import { useRouter } from 'next/navigation'

export default function OnboardingPage(){
  const supabase = createBrowserClient()
  const router = useRouter()
  const [name, setName] = useState('')
  const [firm, setFirm] = useState('')
  const [style, setStyle] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(()=>{
    (async ()=>{
      const { data } = await supabase.auth.getUser()
      const user = data.user
      const full = (user?.user_metadata as any)?.full_name || user?.email || ''
      setName(full)
    })()
  },[])

  async function handleStart(){
    setSaving(true)
    try{
      const updates:any = { user_metadata: { onboarded: true, assistant_style: style || 'friendly-tn', firm: firm || null } }
      await supabase.auth.updateUser(updates)
      router.replace('/chat')
    }catch(e){ console.error(e) }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <a href="/" className="text-sm text-gray-300 hover:text-white">← Back to Dashboard</a>
          <h1 className="text-3xl font-bold text-white mt-2">Welcome to ClosingPilot TN</h1>
          <p className="text-sm text-gray-400 mt-2">Let's set up your account so we can personalize your experience.</p>
        </div>

        <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-1">Full name</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-1">Brokerage / Firm (optional)</label>
            <input value={firm} onChange={e=>setFirm(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-2">Choose your assistant style</label>
            <PersonalitySelector currentStyle={style || 'friendly-tn'} onSelect={(s:any)=>setStyle(s)} />
          </div>
          <div className="flex justify-end">
            <button onClick={handleStart} disabled={saving} className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg">{saving? 'Saving...':'Get Started'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
