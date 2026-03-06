'use client'
import React, { useEffect, useState } from 'react'

export default function GhlSettings({ tenantId }: { tenantId?: string }){
  const [settings, setSettings] = useState({ ghl_location_id: '', ghl_api_key: '', messages_limit: 1000, comms_email_used: 0, comms_sms_used: 0 })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [showKey, setShowKey] = useState(false)
  const [tenantIdState, setTenantIdState] = useState<string|null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(()=>{
    setLoading(true)
    const idToUse = tenantId || null
    const fetchByUserFallback = async () => {
      try{
        // hardcoded user_id=1 for now per instructions
        const res = await fetch('/api/tenants?user_id=1')
        if(!res.ok) return
        const j = await res.json()
        if(j && j.tenant){ setSettings((s:any)=>({...s, ...j.tenant})); setTenantIdState(j.tenant.id) }
      }catch(e){}
    }

    if (idToUse) {
      fetch(`/api/tenants?id=${encodeURIComponent(idToUse)}`).then(r=>r.json()).then(j=>{
        if(j && j.tenant){ setSettings((s:any)=>({...s, ...j.tenant})); setTenantIdState(j.tenant.id) }
      }).catch(()=>{}).finally(()=>setLoading(false))
    } else {
      fetchByUserFallback().finally(()=>setLoading(false))
    }
  },[tenantId])

  async function handleSave(){
    setSaving(true); setError(null)
    try{
      let res
      if(tenantIdState){
        const payload = { id: tenantIdState, ghl_location_id: settings.ghl_location_id, ghl_api_key: settings.ghl_api_key, messages_limit: settings.messages_limit }
        res = await fetch('/api/tenants', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      } else {
        const payload = { name: 'Default Tenant', ghl_location_id: settings.ghl_location_id, ghl_api_key: settings.ghl_api_key, messages_limit: settings.messages_limit }
        res = await fetch('/api/tenants', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      }
      const j = await res.json()
      if(!res.ok || j.error){ setError(j.error||'Save failed'); setSaving(false); return }
      // store tenant id if created
      if(j.tenant && j.tenant.id) setTenantIdState(j.tenant.id)
      setSaved(true)
      setTimeout(()=>setSaved(false),3000)
    }catch(e:any){ setError(String(e)) }
    setSaving(false)
  }

  async function testConnection(){
    try{
      setTestResult(null)
      const res = await fetch('/api/ghl/test', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ghl_location_id: settings.ghl_location_id, ghl_api_key: settings.ghl_api_key }) })
      const j = await res.json()
      if(!res.ok || j.error){ setTestResult({ success: false, message: j.error || 'Connection failed' }); return }
      setTestResult({ success: true, message: j.location_name || 'Connection successful!' })
    }catch(e:any){ setTestResult({ success: false, message: String(e) }) }
  }

  const totalSent = (settings.comms_email_used||0) + (settings.comms_sms_used||0)
  const pct = Math.min(100, Math.round((totalSent / (settings.messages_limit||1)) * 100))

  return (
    <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3"><span className="text-cyan-300">⚙️</span><h3 className="text-lg font-bold text-white">GHL Integration Settings</h3></div>
        <div className="text-sm text-gray-400">{tenantId ? 'Tenant: '+tenantId : 'No tenant selected'}</div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">GHL Location ID</label>
          <input value={settings.ghl_location_id} onChange={e=>setSettings({...settings, ghl_location_id: e.target.value})} placeholder="Enter your GHL Location ID" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">GHL API Key</label>
          <div className="relative">
            <input type={showKey? 'text':'password'} value={settings.ghl_api_key} onChange={e=>setSettings({...settings, ghl_api_key: e.target.value})} placeholder="Enter your GHL API Key" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
            <button onClick={()=>setShowKey(s=>!s)} className="absolute right-2 top-2 text-sm text-gray-300">{showKey? 'Hide':'Show'}</button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Monthly Message Limit</label>
          <input type="number" value={settings.messages_limit} onChange={e=>setSettings({...settings, messages_limit: Number(e.target.value)})} className="w-48 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
        </div>

        <div className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><span className="text-sm text-cyan-300">📈</span><div className="text-sm text-white">Usage this month</div></div>
            <div className="text-sm text-gray-300">{totalSent}/{settings.messages_limit}</div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {error && <div className="text-sm text-red-400">{error}</div>}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button onClick={testConnection} className="px-4 py-2 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10">Test GHL Connection</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:from-emerald-400 hover:to-cyan-400 font-semibold">{saving? 'Saving...':'Save Settings'}</button>
        </div>
      </div>
    </div>
  )
}
