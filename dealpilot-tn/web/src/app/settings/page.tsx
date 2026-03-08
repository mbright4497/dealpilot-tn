'use client'
import React
import {useRouter} from "next/navigation"
, {useEffect, useState} from 'react'

function Toggle({checked,onChange,ariaLabel}:{checked:boolean,onChange:(_:boolean)=>void,ariaLabel?:string}){
  const router = useRouter()
  return (
    <button aria-label={ariaLabel} onClick={()=>onChange(!checked)} className={`w-12 h-6 rounded-full p-1 transition-colors ${checked? 'bg-[#f97316]':'bg-gray-700'}`}>
      <div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${checked? 'translate-x-6':'translate-x-0'}`}></div>
    </button>
  )
}

export default function SettingsPage(){
  const [tab,setTab]=useState('profile')
  const [profile,setProfile]=useState<any>({fullName:'',email:'',phone:'',brokerage:'',license:'',officeAddress:''})
  const [saving,setSaving]=useState(false)
  const [toast,setToast]=useState('')
  const [notifications,setNotifications]=useState<any>({newDeal:true,inspectionReminder:true,evaDaily:true,productUpdates:false})
  const [integrations,setIntegrations]=useState<any>({ghl:false,mls:false,stripe:false,calendar:false})
  useEffect(()=>{async function load(){
    try{const r=await fetch('/api/profile'); if(r.ok){const j=await r.json(); setProfile({...profile,...j})}}
    catch(e){console.error(e)} }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  async function saveProfile(){
    setSaving(true)
    try{
      const r=await fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(profile)})
      if(r.ok){setToast('Profile saved'); setTimeout(()=>setToast(''),3000)} else {setToast('Save failed'); setTimeout(()=>setToast(''),3000)}
    }catch(e){setToast('Save error'); setTimeout(()=>setToast(''),3000)}
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-[#061021] text-gray-100 p-6">
      <div className="mb-3"><button onClick={()=>router.back()} className="text-slate-400 hover:text-orange-400 flex items-center gap-2">← Back</button></div>
<header className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">⚙️ Settings</h1>
        <p className="text-sm text-gray-400">Manage your ClosingPilot TN account</p>
      </header>

      <div className="mb-4 flex gap-2">
        {['profile','notifications','integrations','billing'].map(t=> (
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-t-lg ${tab===t? 'bg-gray-800 text-orange-400':'bg-gray-700 text-gray-300'}`}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-b-lg p-6">
        {tab==='profile' && (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-2xl font-bold">{(profile.fullName||'').split(' ').map((s:any)=>s[0]).slice(0,2).join('')||'CP'}</div>
              <div>
                <div className="text-sm text-gray-300">Profile Photo</div>
                <div className="mt-2"><button className="bg-gray-700 px-3 py-1 rounded text-sm">Upload Photo</button></div>
              </div>
            </div>

            <section className="bg-[#0f223a] border border-gray-700 p-4 rounded">
              <h3 className="flex items-center gap-2 text-lg font-semibold"><span>👤</span> Personal Information</h3>
              <div className="mt-3 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-300 block">Full Name</label>
                  <input value={profile.fullName||''} onChange={e=>setProfile({...profile,fullName:e.target.value})} className="mt-1 w-full rounded bg-[#1a1a2e] border border-white/10 px-3 py-2 text-white" />
                  <p className="text-xs text-gray-500 mt-1">Your display name shown to clients</p>
                </div>
                <div>
                  <label className="text-sm text-gray-300 block">Email</label>
                  <input value={profile.email||''} disabled className="mt-1 w-full rounded bg-[#0b1320] border border-white/10 px-3 py-2 text-gray-400" />
                  <p className="text-xs text-gray-500 mt-1">Email comes from authentication</p>
                </div>
                <div>
                  <label className="text-sm text-gray-300 block">Phone</label>
                  <input value={profile.phone||''} onChange={e=>setProfile({...profile,phone:e.target.value})} className="mt-1 w-full rounded bg-[#1a1a2e] border border-white/10 px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-sm text-gray-300 block">Brokerage Name</label>
                  <input value={profile.brokerage||''} onChange={e=>setProfile({...profile,brokerage:e.target.value})} className="mt-1 w-full rounded bg-[#1a1a2e] border border-white/10 px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-sm text-gray-300 block">License Number</label>
                  <input value={profile.license||''} onChange={e=>setProfile({...profile,license:e.target.value})} className="mt-1 w-full rounded bg-[#1a1a2e] border border-white/10 px-3 py-2 text-white" />
                  <p className="text-xs text-gray-500 mt-1">Your TN real estate license number</p>
                </div>
                <div>
                  <label className="text-sm text-gray-300 block">Office Address</label>
                  <input value={profile.officeAddress||''} onChange={e=>setProfile({...profile,officeAddress:e.target.value})} className="mt-1 w-full rounded bg-[#1a1a2e] border border-white/10 px-3 py-2 text-white" />
                </div>
              </div>

              <div className="mt-4 text-right">
                <button onClick={saveProfile} disabled={saving} className="bg-orange-500 text-black px-4 py-2 rounded">{saving? 'Saving...':'Save'}</button>
              </div>
            </section>
          </div>
        )}

        {tab==='notifications' && (
          <div className="grid gap-4">
            {[
              {key:'newDeal',title:'New deal assigned',desc:'Notify when a new deal is assigned to you'},
              {key:'inspectionReminder',title:'Inspection deadline in 48hrs',desc:'Receive reminders before inspection windows'},
              {key:'evaDaily',title:'EVA daily briefing',desc:'Daily summary email from EVA'},
              {key:'productUpdates',title:'Product updates',desc:'News and product announcements'}
            ].map(item=> (
              <div key={item.key} className="bg-[#0f223a] border border-gray-700 p-4 rounded flex items-center justify-between">
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-gray-400">{item.desc}</div>
                </div>
                <div><Toggle checked={Boolean((notifications as any)[item.key])} onChange={(v)=>setNotifications({...notifications,[item.key]:v})} /></div>
              </div>
            ))}
          </div>
        )}

        {tab==='integrations' && (
          <div className="grid md:grid-cols-2 gap-4">
            {[{key:'ghl',title:'GoHighLevel'},{key:'mls',title:'MLS Feed'},{key:'stripe',title:'Stripe Billing'},{key:'calendar',title:'Google Calendar'}].map(i=> (
              <div key={i.key} className="bg-[#0f223a] border border-gray-700 p-4 rounded hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{i.title}</div>
                    <div className="text-xs text-gray-400">Configure connection and status</div>
                  </div>
                  <div>
                    <span className={`px-2 py-1 rounded text-xs ${integrations[i.key]? 'bg-green-600':'bg-gray-600'}`}>{integrations[i.key]? 'Connected':'Not Connected'}</span>
                  </div>
                </div>
                <div className="mt-3 text-right"><button className="bg-gray-700 px-3 py-1 rounded">Configure</button></div>
              </div>
            ))}
          </div>
        )}

        {tab==='billing' && (
          <div className="space-y-4">
            <div className="bg-[#0f223a] border border-gray-700 p-4 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-300">Current Plan</div>
                  <div className="font-semibold text-white">Pro Plan — $49/mo</div>
                </div>
                <div>
                  <button className="bg-orange-500 text-black px-3 py-1 rounded">Manage Subscription</button>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-white/10 h-3 rounded overflow-hidden"><div className="h-full bg-orange-500" style={{width:'45%'}}></div></div>
                <div className="text-xs text-gray-400 mt-1">Usage: 45% of monthly quota</div>
              </div>
            </div>

            <div className="bg-[#0f223a] border border-gray-700 p-4 rounded">
              <div className="text-sm text-gray-300">Invoice History</div>
              <div className="text-xs text-gray-400 mt-2">No invoices yet (placeholder)</div>
            </div>
          </div>
        )}

      </div>

      {toast && (<div className="fixed bottom-6 left-6 bg-green-600 text-black px-4 py-2 rounded">{toast}</div>)}
    </div>
  )
}
