'use client'
import React, { useState, useEffect } from 'react'

export default function SettingsPage(){
  const [ghlToken, setGhlToken] = useState('')
  useEffect(()=>{ try{ const t = localStorage.getItem('ghl_token'); if(t) setGhlToken(t) }catch(e){} },[])
  const save = ()=>{ try{ localStorage.setItem('ghl_token', ghlToken); alert('Saved to localStorage (restart required for server-side).') }catch(e){ alert('Save failed') } }
  return (<div className="p-6"><h1 className="text-2xl font-bold">Settings</h1><div className="mt-2"><a href="/chat" className="text-sm text-gray-400 hover:text-white">← Back to Dashboard</a></div>
    <div className="mt-4 max-w-lg">
      <label className="text-sm text-gray-300">GoHighLevel API Key</label>
      <input value={ghlToken} onChange={e=>setGhlToken(e.target.value)} placeholder="Paste GHL API key" className="w-full mt-2 p-2 rounded bg-[#081224] border border-white/10" />
      <div className="mt-3 flex gap-2">
        <button onClick={save} className="px-4 py-2 bg-emerald-500 rounded">Save</button>
        <button onClick={()=>{ setGhlToken(''); localStorage.removeItem('ghl_token') }} className="px-4 py-2 bg-gray-700 rounded">Clear</button>
      </div>
      <p className="text-xs text-gray-400 mt-3">Note: to fully enable server-side GHL proxy, set GHL_API_KEY as an environment variable on the server.</p>
    </div>
  </div>)
}
