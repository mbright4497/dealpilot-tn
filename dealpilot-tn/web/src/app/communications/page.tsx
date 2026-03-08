'use client'
import React, {useEffect, useState, useRef} from 'react'

export default function CommunicationsPage(){
  const [contacts,setContacts]=useState<any[]>([])
  const [selected,setSelected]=useState<any>(null)
  const [history,setHistory]=useState<any[]>([])
  const [tab,setTab]=useState<'all'|'sms'|'email'>('all')
  const [query,setQuery]=useState('')
  const [showCompose,setShowCompose]=useState(false)

  useEffect(()=>{
    fetch('/api/communications/contacts?deal_id=all').then(r=>r.json()).then(j=>{ if(j.ok) setContacts(j.contacts||[]) }).catch(()=>setContacts([]))
  },[])

  async function loadHistory(contact:any){
    setSelected(contact)
    const res = await fetch(`/api/communications/history?contact_id=${contact.contact_id}`)
    const j = await res.json()
    if(j.ok) setHistory(j.history||[])
    else setHistory([])
  }

  const filtered = contacts.filter(c=> (c.contacts?.name||'').toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="min-h-screen bg-[#061021] text-gray-100 p-6">
      <a href="/chat" className="mb-4 inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        ← Back
      </a>

      <div className="grid grid-cols-12 gap-4">
        {/* Left */}
        <div className="col-span-3 bg-gray-800 p-4 rounded card">
          <div className="flex items-center gap-2 mb-3">
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search contacts" className="flex-1 bg-[#0f223a] p-2 rounded input" />
            <button onClick={()=>setShowCompose(true)} className="bg-orange-500 text-black px-3 py-1 rounded">+</button>
          </div>
          <div className="space-y-2 overflow-auto max-h-[70vh]">
            {filtered.map((c:any)=> (
              <div key={c.id} onClick={()=>loadHistory(c)} className="p-2 rounded hover:bg-gray-700 cursor-pointer flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-orange-500 flex items-center justify-center font-bold">{(c.contacts?.name||'')[0]||'?'}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2"><div className="font-medium">{c.contacts?.name}</div><div className="text-xs text-gray-400">{c.role}</div></div>
                  <div className="text-xs text-gray-400">Last: {c.last_message_preview||'—'}</div>
                </div>
                {c.unread_count>0 && <div className="bg-red-600 text-white text-xs px-2 py-0.5 rounded">{c.unread_count}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Center */}
        <div className="col-span-6 bg-gray-800 p-4 rounded card flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button onClick={()=>setTab('all')} className={`px-3 py-1 rounded ${tab==='all'?'border-b-2 border-orange-500':''}`}>All</button>
              <button onClick={()=>setTab('sms')} className={`px-3 py-1 rounded ${tab==='sms'?'border-b-2 border-orange-500':''}`}>SMS</button>
              <button onClick={()=>setTab('email')} className={`px-3 py-1 rounded ${tab==='email'?'border-b-2 border-orange-500':''}`}>Email</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>setShowCompose(true)} className="bg-orange-500 text-black px-3 py-1 rounded">Compose</button>
            </div>
          </div>

          <div className="flex-1 overflow-auto space-y-3" style={{minHeight:300}}>
            {selected ? history.filter((h:any)=> tab==='all' || h.channel===tab).map((m:any)=> (
              <div key={m.id} className={`max-w-[70%] p-3 rounded ${m.from_agent? 'ml-auto bg-teal-600 text-black':'bg-[#0f223a] text-gray-100'}`}>
                <div className="text-xs text-gray-300">{m.channel.toUpperCase()} • {new Date(m.sent_at||m.created_at||Date.now()).toLocaleString()}</div>
                {m.subject && <div className="font-semibold">{m.subject}</div>}
                <div className="mt-1">{m.body}</div>
                <div className="text-xs text-gray-400 mt-1">{m.status||'sent'}</div>
              </div>
            )) : <div className="text-gray-500">Select a contact to view the conversation</div>}
          </div>

          <div className="mt-3">
            {/* quick compose bar placeholder */}
          </div>
        </div>

        {/* Right */}
        <div className="col-span-3 bg-gray-800 p-4 rounded card">
          {selected ? (
            <div>
              <div className="text-lg font-semibold">{selected.contacts?.name}</div>
              <div className="text-sm text-gray-400">{selected.contacts?.email}</div>
              <div className="text-sm text-gray-400">{selected.contacts?.phone}</div>
              <div className="mt-3 text-xs text-gray-400">Deal: {selected.deal_title||'—'}</div>
              <div className="mt-4 space-y-2">
                <div className="text-xs text-gray-400">Messages: {history.length}</div>
                <div className="text-xs text-gray-400">Last contacted: {history[history.length-1]?.sent_at||'—'}</div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="bg-gray-700 px-3 py-1 rounded">Call</button>
                <button className="bg-gray-700 px-3 py-1 rounded">SMS</button>
                <button className="bg-gray-700 px-3 py-1 rounded">Email</button>
              </div>
            </div>
          ) : <div className="text-gray-500">No contact selected</div>}
        </div>
      </div>
    </div>
  )
}
