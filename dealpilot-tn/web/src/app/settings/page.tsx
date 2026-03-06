'use client'
import React, { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'

export default function SettingsPage(){
  const supabase = createBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>({ full_name:'', email:'', phone:'', company:'', license:'' })
  const [plan, setPlan] = useState('Free')
  const [usage, setUsage] = useState({ transactions:0, storage:0 })
  const [notif, setNotif] = useState({ email:true, sms:false, daily:true, deadlines:true, updates:true })

  useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        const res = await fetch('/api/profile')
        if(!res.ok) throw new Error('Failed')
        const j = await res.json()
        const p = j.profile
        if(mounted && p){
          setProfile({ full_name: (p?.full_name||''), email: p?.email||'', phone: p?.phone||'', company: p?.brokerage||'', license: p?.license_number||'' })
          setPlan(p?.subscription_tier || 'Free')
        }
      }catch(e){
        // fallback: try to get session email
        try{
          const { data } = await supabase.auth.getUser()
          const user = data.user
          if(user && mounted) setProfile((s:any)=>({...s, email: user.email || ''}))
        }catch(_){}
        console.error(e)
      }
      if(mounted) setLoading(false)
    })()
    return ()=>{ mounted=false }
  },[])

  async function saveProfile(){
    setSaving(true)
    try{
      const payload = { full_name: profile.full_name, phone: profile.phone, brokerage: profile.company, license_number: profile.license, notification_prefs: notif }
      const res = await fetch('/api/profile', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const j = await res.json()
      if(!res.ok || j.error){ throw new Error(j.error || 'Save failed') }
      alert('Profile saved')
    }catch(e:any){ alert('Save failed: '+(e.message||e)) }
    setSaving(false)
  }

  if(loading) return <div className="min-h-screen p-8 bg-gradient-to-b from-gray-900 to-black">Loading…</div>

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Profile Information</h2>
          <div className="grid grid-cols-1 gap-3">
            <label className="text-sm text-gray-300">Full Name</label>
            <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={profile.full_name} onChange={e=>setProfile({...profile, full_name: e.target.value})} />
            <label className="text-sm text-gray-300">Email (read-only)</label>
            <input className="w-full bg-white/6 border border-white/6 rounded-lg px-3 py-2 text-gray-300" value={profile.email} readOnly />
            <label className="text-sm text-gray-300">Phone</label>
            <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={profile.phone} onChange={e=>setProfile({...profile, phone: e.target.value})} />
            <label className="text-sm text-gray-300">Brokerage / Company</label>
            <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={profile.company} onChange={e=>setProfile({...profile, company: e.target.value})} />
            <label className="text-sm text-gray-300">License Number</label>
            <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={profile.license} onChange={e=>setProfile({...profile, license: e.target.value})} />
            <div className="flex justify-end mt-3">
              <button onClick={saveProfile} disabled={saving} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg">{saving? 'Saving...':'Save Changes'}</button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-3">Account Security</h3>
          <div className="space-y-3 text-sm text-gray-300">
            <button className="px-3 py-2 bg-white/5 rounded-lg">Change password</button>
            <div>Connected accounts: <span className="ml-2 text-white">Google</span></div>
            <div>Two-factor authentication: <button className="ml-2 px-2 py-1 bg-white/5 rounded">Enable</button></div>
          </div>
        </div>

        <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-3">Subscription & Services</h3>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-300">Current Plan</div>
            <div className="px-2 py-1 rounded-full text-sm bg-cyan-500/20 text-cyan-300">{plan}</div>
          </div>
          <div className="mb-3">
            <div className="text-sm text-gray-300 mb-1">Usage</div>
            <div className="w-full bg-white/10 rounded-full h-2 mb-2"><div className="h-2 rounded-full bg-cyan-400" style={{ width: '20%' }} /></div>
            <div className="text-sm text-gray-300">Transactions used: {usage.transactions} • Storage used: {usage.storage}MB</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><div className="text-sm text-white">EVA AI Assistant</div><input type="checkbox" defaultChecked /></div>
            <div className="flex items-center justify-between"><div className="text-sm text-white">Priority Support</div><input type="checkbox" /></div>
            <div className="flex items-center justify-between"><div className="text-sm text-white">Custom Branding</div><input type="checkbox" /></div>
            <div className="flex items-center justify-between"><div className="text-sm text-white">API Access</div><input type="checkbox" /></div>
          </div>
        </div>

        <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-3">Notification Preferences</h3>
          <div className="space-y-2 text-sm">
            <label className="flex items-center justify-between"><span className="text-white">Email notifications</span><input type="checkbox" checked={notif.email} onChange={e=>setNotif({...notif, email: e.target.checked})} /></label>
            <label className="flex items-center justify-between"><span className="text-white">SMS alerts</span><input type="checkbox" checked={notif.sms} onChange={e=>setNotif({...notif, sms: e.target.checked})} /></label>
            <label className="flex items-center justify-between"><span className="text-white">Daily briefing</span><input type="checkbox" checked={notif.daily} onChange={e=>setNotif({...notif, daily: e.target.checked})} /></label>
            <label className="flex items-center justify-between"><span className="text-white">Deadline reminders</span><input type="checkbox" checked={notif.deadlines} onChange={e=>setNotif({...notif, deadlines: e.target.checked})} /></label>
            <label className="flex items-center justify-between"><span className="text-white">Transaction updates</span><input type="checkbox" checked={notif.updates} onChange={e=>setNotif({...notif, updates: e.target.checked})} /></label>
          </div>
        </div>
      </div>
    </div>
  )
}
