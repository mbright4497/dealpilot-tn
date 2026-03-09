import React, { useEffect, useState } from 'react'

type Party = { id?: number, name?: string, role?: string, email?: string, phone?: string, comm_preference?: string }

export default function DealPartiesPanel({ transactionId }: { transactionId?: number }){
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name:'', role:'', email:'', phone:'', comm_preference:'' })
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [selectedContactId, setSelectedContactId] = useState<number|null>(null)
  const [query, setQuery] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)

  useEffect(()=>{
    let mounted = true
    if(!transactionId){ setLoading(false); return }
    (async ()=>{
      try{
        // try deal-state first (contacts may be embedded). fallback to communications contacts API.
        const res = await fetch(`/api/deal-state/${transactionId}`)
        if(!mounted) return
        if(res.ok){ const j = await res.json(); const c = j.contacts || []; setParties(c.map((it:any)=>({ id: it.id, name: it.name || it.fullname || it.contacts?.name, role: it.role, email: it.email || it.contacts?.email, phone: it.phone || it.contacts?.phone, comm_preference: it.comm_preference || '' }))); setLoading(false); return }
      }catch(e){}
      try{
        const r2 = await fetch(`/api/communications/contacts?deal_id=${transactionId}`)
        if(!mounted) return
        if(r2.ok){ const j2 = await r2.json(); setParties((j2.contacts||[]).map((c:any)=>({ id: c.id, name: c.contacts?.name || c.contacts?.fullname || '', role: c.role, email: c.contacts?.email, phone: c.contacts?.phone, comm_preference: c.contacts?.comm_preference }))); }
    }catch(e){}
    finally{ if(mounted) setLoading(false) }
    })()
    return ()=>{ mounted = false }
  },[transactionId])

  async function handleAdd(e?:any){ if(e) e.preventDefault(); if(!transactionId) return; if(!form.name||!form.role) return alert('Name and role required');
    setLoading(true)
    try{
      const payload = { transactionId, contacts: [{ name: form.name, role: form.role, email: form.email, phone: form.phone, company: '' }] }
      const res = await fetch('/api/deal-parties/save', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const j = await res.json()
      if(res.ok){ setParties(prev=>[...(prev||[]), ...(j.contacts||[])])
        setForm({ name:'', role:'', email:'', phone:'', comm_preference:'' })
        setShowForm(false)
      }else{ alert(j.error || 'Failed to save') }
    }catch(err){ alert('Error saving contact') }
    finally{ setLoading(false) }
  }

  return (
    <div className="bg-slate-800 text-slate-100 p-4 rounded-md shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Deal Parties</h3>
        <div className="text-sm text-slate-400">Transaction #{transactionId || '—'}</div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-300">{parties.length} parties</div>
          <button onClick={()=>setShowForm(s=>!s)} className="px-3 py-1 bg-orange-500 text-black rounded text-sm">Add Party</button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="space-y-2 p-2 bg-gray-900 rounded">
            <div className="relative">
              <input placeholder="Search GHL contacts or type a name" value={query} onChange={async e=>{ const v=e.target.value; setQuery(v); setSelectedContactId(null); setForm({...form, name:v}); if(v && v.length>1){ try{ const r=await fetch(`/api/contacts/search?q=${encodeURIComponent(v)}&ghl_only=true`); if(r.ok){ const j=await r.json(); setSuggestions(j.contacts||[]); setSuggestOpen(true) } }catch(e){ setSuggestions([]); setSuggestOpen(false) } } else { setSuggestions([]); setSuggestOpen(false) } }} className="w-full p-2 bg-gray-800 rounded" />
              {suggestOpen && suggestions.length>0 && (
                <div className="absolute z-20 bg-gray-900 border border-gray-700 mt-1 w-full rounded max-h-48 overflow-auto">
                  {suggestions.map((s:any,i:number)=> (
                    <div key={i} className="p-2 hover:bg-gray-800 cursor-pointer" onClick={()=>{ setSelectedContactId(s.id); setForm({...form, name: s.name || '', email: s.email || '', phone: s.phone || ''}); setQuery(s.name||''); setSuggestOpen(false) }}>{s.name} <span className="text-xs text-gray-400">{s.email ? ' • '+s.email : ''}</span> <span className="ml-2 px-1 py-0.5 text-xs bg-blue-600 rounded text-white">GHL</span></div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input placeholder="Role" value={form.role} onChange={e=>setForm({...form, role: e.target.value})} className="w-36 p-2 bg-gray-800 rounded" />
              <input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className="flex-1 p-2 bg-gray-800 rounded" />
            </div>
            <div className="flex gap-2">
              <input placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="flex-1 p-2 bg-gray-800 rounded" />
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={()=>setShowForm(false)} className="px-3 py-1 bg-gray-700 rounded mr-2">Cancel</button>
              <button type="submit" className="px-3 py-1 bg-green-600 rounded">Save</button>
            </div>
          </form>
        )}

        {loading && <div className="animate-pulse space-y-2"><div className="h-10 bg-slate-700 rounded" /><div className="h-10 bg-slate-700 rounded" /></div>}

        {!loading && parties.length===0 && <div className="text-gray-400">No parties for this deal.</div>}

        {!loading && parties.map((p, i)=> (
          <div key={i} className="p-3 bg-gray-900 rounded flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-orange-500 flex items-center justify-center font-bold">{(p.name||'?')[0]}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.role}</div>
                </div>
                <div className="text-xs text-gray-400">{p.comm_preference || ''}</div>
              </div>
              <div className="mt-2 text-sm text-gray-300">{p.email || ''} • {p.phone || ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
