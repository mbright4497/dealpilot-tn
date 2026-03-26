'use client'
import { useEffect, useMemo, useState } from 'react'

export const dynamic = 'force-dynamic'

export default function CommunicationsPage(){
  const [items,setItems]=useState<any[]>([])
  const [grouped,setGrouped]=useState<Record<string, any[]>>({})
  const [ghlStatus,setGhlStatus]=useState('Not connected')
  const [showCompose,setShowCompose]=useState(false)
  const [selectedRole,setSelectedRole]=useState('lender')
  const [dealId,setDealId]=useState<number>(0)
  const [type,setType]=useState<'email'|'sms'>('email')
  const [subject,setSubject]=useState('')
  const [message,setMessage]=useState('')
  const [status,setStatus]=useState('')

  useEffect(()=>{(async()=>{
    const p = await fetch('/api/profile').then(r=>r.json()).catch(()=>({}))
    if(p?.profile?.ghl_api_key) setGhlStatus('Connected')
    const list = await fetch('/api/communications').then(r=>r.json()).catch(()=>({}))
    const rows = list?.communications || []
    setItems(rows)
    const m: Record<string, any[]> = {}
    rows.forEach((r:any)=>{ const key = r.contact_name || r.contact_role || 'Unknown'; if(!m[key]) m[key]=[]; m[key].push(r) })
    setGrouped(m)
  })()},[])

  async function askRevaDraft(){
    const prompt = `Draft a ${type.toUpperCase()} to ${selectedRole} for deal at deal #${dealId}`
    const j = await fetch('/api/reva/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}],dealId})}).then(r=>r.json())
    setMessage(j?.reply || '')
  }
  async function sendNow(){
    const ghlApiKey = typeof window !== 'undefined' ? localStorage.getItem('ghl_api_key') : null
    const res = await fetch('/api/communications/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,dealId,contactRole:selectedRole,subject,message,ghlApiKey})})
    const j = await res.json()
    setStatus(res.ok ? `Sent (id ${j.communicationId})` : (j.error || 'Failed'))
  }
  const groups = useMemo(()=>Object.entries(grouped),[grouped])

  return (
    <div className="min-h-screen bg-[#061021] text-gray-100 p-6">
      <a href="/chat" className="mb-4 inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        ← Back
      </a>

      <div className="mb-3 rounded border border-white/10 bg-[#0b1628] p-3 text-sm">
        GHL status: <span className={ghlStatus === 'Connected' ? 'text-emerald-400' : 'text-gray-400'}>{ghlStatus}</span>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4 rounded bg-gray-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">Sent Messages</div>
            <button onClick={()=>setShowCompose(true)} className="rounded bg-orange-500 px-3 py-1 text-black">Compose</button>
          </div>
          <div className="space-y-3">
            {groups.length===0 && <div className="text-sm text-gray-400">No messages yet</div>}
            {groups.map(([name, entries])=>(
              <div key={name} className="rounded border border-white/10 p-2">
                <div className="font-medium">{name}</div>
                <div className="text-xs text-gray-400">{entries.length} messages</div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-8 rounded bg-gray-800 p-4">
          <div className="font-semibold">Recent</div>
          <div className="mt-3 space-y-2">
            {items.map((m:any)=>(
              <div key={m.id} className="rounded bg-[#0f223a] p-3">
                <div className="text-xs text-gray-400">{m.type?.toUpperCase()} • {new Date(m.created_at).toLocaleString()}</div>
                <div className="text-sm">{m.contact_name} ({m.contact_role})</div>
                <div className="text-xs text-gray-300">{m.subject || ''}</div>
                <div className="text-sm text-gray-200">{String(m.message || '').slice(0,120)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-white/10 bg-[#0c1628] p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase text-gray-400">Compose</div>
                <div className="text-lg font-semibold">Send communication</div>
              </div>
              <button onClick={()=>setShowCompose(false)} className="text-gray-400 hover:text-white">Close</button>
            </div>
            <input type="number" value={dealId || ''} onChange={e=>setDealId(Number(e.target.value))} placeholder="Deal ID" className="w-full rounded-lg border border-white/10 bg-[#081224] px-3 py-2 text-sm text-white" />
            <input value={selectedRole} onChange={e=>setSelectedRole(e.target.value)} placeholder="Contact role (lender/buyer/seller/title)" className="w-full rounded-lg border border-white/10 bg-[#081224] px-3 py-2 text-sm text-white" />
            <div className="flex gap-2">
              <button onClick={()=>setType('email')} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${type==='email' ? 'border-orange-400 text-white' : 'border-white/10 text-gray-300'}`}>Email</button>
              <button onClick={()=>setType('sms')} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${type==='sms' ? 'border-orange-400 text-white' : 'border-white/10 text-gray-300'}`}>SMS</button>
            </div>
            {type==='email' && <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject" className="w-full rounded-lg border border-white/10 bg-[#081224] px-3 py-2 text-sm text-white" />}
            <textarea rows={5} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Message body" className="w-full rounded-lg border border-white/10 bg-[#081224] px-3 py-2 text-sm text-white" />
            {status && <div className="text-sm text-emerald-300">{status}</div>}

            <div className="flex justify-end gap-2">
              <button onClick={askRevaDraft} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white">Ask Reva to draft</button>
              <button onClick={sendNow} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black">Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
