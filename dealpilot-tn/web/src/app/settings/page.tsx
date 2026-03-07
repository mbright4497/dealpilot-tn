'use client'
import React, {useEffect, useState} from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'

export default function SettingsPage(){
  const supabase = createBrowserClient()
  const [profile, setProfile] = useState<any>({name:'',email:'',phone:'',brokerage:'',license:''})
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(true)
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [deadlineReminders, setDeadlineReminders] = useState(true)
  const [evaDaily, setEvaDaily] = useState(true)

  useEffect(()=>{(async ()=>{
    try{
      const { data } = await supabase.auth.getUser()
      const email = data?.user?.email || ''
      setProfile(p=>({...p,email}))
      const res = await fetch('/api/profile')
      if(res.ok){ const j = await res.json(); setProfile(j) }
    }catch(e){}
    setLoading(false)
  })()},[])

  async function save(){
    await fetch('/api/profile', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(profile) })
    alert('Saved')
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-white rounded shadow">
          <h2 className="font-semibold">Profile</h2>
          <div className="mt-3 space-y-2">
            <input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="Name" className="w-full border p-2 rounded" />
            <input value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})} placeholder="Email" className="w-full border p-2 rounded" />
            <input value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="Phone" className="w-full border p-2 rounded" />
            <input value={profile.brokerage} onChange={e=>setProfile({...profile,brokerage:e.target.value})} placeholder="Brokerage" className="w-full border p-2 rounded" />
            <input value={profile.license} onChange={e=>setProfile({...profile,license:e.target.value})} placeholder="License Number" className="w-full border p-2 rounded" />
            <div className="flex justify-end"><button onClick={save} className="px-4 py-2 bg-orange-500 text-white rounded">Save Profile</button></div>
          </div>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <h2 className="font-semibold">Notifications</h2>
          <div className="mt-3 space-y-2 text-sm">
            <label className="flex items-center justify-between"><span>Email alerts</span><input type="checkbox" checked={emailAlerts} onChange={e=>setEmailAlerts(e.target.checked)} /></label>
            <label className="flex items-center justify-between"><span>Deadline reminders</span><input type="checkbox" checked={deadlineReminders} onChange={e=>setDeadlineReminders(e.target.checked)} /></label>
            <label className="flex items-center justify-between"><span>EVA daily briefing</span><input type="checkbox" checked={evaDaily} onChange={e=>setEvaDaily(e.target.checked)} /></label>
          </div>
          <h2 className="font-semibold mt-4">Appearance</h2>
          <div className="mt-2"><label className="flex items-center justify-between"><span>Dark mode</span><input type="checkbox" checked={dark} onChange={e=>setDark(e.target.checked)} /></label></div>
        </div>

        <div className="p-4 bg-white rounded shadow col-span-1 md:col-span-2">
          <h2 className="font-semibold">Subscription</h2>
          <div className="mt-3 p-4 border rounded bg-gray-50 flex items-center justify-between">
            <div>
              <div className="font-semibold">Free Trial</div>
              <div className="text-sm text-gray-600">Upgrade to unlock unlimited transactions and priority EVA.</div>
            </div>
            <button className="px-4 py-2 bg-orange-500 text-white rounded">Upgrade</button>
          </div>
        </div>

        <div className="p-4 bg-white rounded shadow col-span-1 md:col-span-2">
          <h2 className="font-semibold text-red-600">Danger Zone</h2>
          <div className="mt-3 text-sm text-gray-600">Delete account is disabled in this demo.</div>
          <div className="mt-3"><button disabled className="px-4 py-2 bg-red-300 text-white rounded">Delete Account (Disabled)</button></div>
        </div>

      </div>
    </div>
  )
}
