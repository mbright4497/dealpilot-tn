'use client'
import React, {useEffect, useState} from 'react'

export default function CommunicationsPage(){
  const [contacts,setContacts]=useState([])
  const [deals,setDeals]=useState([])
  const [selected,setSelected]=useState<any>(null)
  const [thread,setThread]=useState([])
  const [query,setQuery]=useState('')
  const [tab,setTab]=useState('messages')
  useEffect(()=>{fetch('/api/communications/contacts?deal_id=all').then(r=>r.json()).then(j=>{if(j.ok) setContacts(j.contacts||[]);})
    fetch('/api/communications/templates').then(r=>r.json()).then(j=>{})
  },[])

  async function selectContact(c:any){
    setSelected(c)
    const res=await fetch(`/api/communications/send?contact_id=${c.contact_id}&deal_id=${c.deal_id}`)
    const j=await res.json()
    if(j.ok) setThread(j.history||[])
  }

  async function sendMessage(text:string){
    if(!selected) return
    const payload={deal_id:selected.deal_id, contact_id:selected.contact_id, channel: tab==='messages'?'sms': tab==='email'?'email':'phone', body: text}
    // optimistic
    setThread(prev=>[...prev,{id:Date.now(), from:'me', body:text, created_at:new Date().toISOString(), channel:payload.channel, status:'queued'}])
    await fetch('/api/communications/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
  }

  const filtered = contacts.filter((c:any)=> c.contacts && c.contacts.name && c.contacts.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="min-h-screen bg-[#061021] text-gray-100 p-6 flex gap-4">
      <div className="w-1/4 bg-gray-800 p-4 rounded">
        <div className="flex items-center justify-between mb-3">
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search" className="bg-[#0f223a] p-2 rounded w-full" />
        </div>
        <div className="space-y-2">
          {filtered.map((d:any)=> (
            <button key={d.id} onClick={()=>selectContact(d)} className="w-full text-left p-2 bg-[#0f223a] rounded">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white">{(d.contacts.name||'')[0]}</div>
                <div>
                  <div className="font-medium">{d.contacts.name}</div>
                  <div className="text-xs text-gray-400">{d.role}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 bg-gray-800 p-4 rounded">
        <div className="mb-3">
          <nav className="flex gap-4">
            <button onClick={()=>setTab('messages')} className={tab==='messages'? 'border-b-2 border-orange-500':''}>Messages</button>
            <button onClick={()=>setTab('email')} className={tab==='email'? 'border-b-2 border-orange-500':''}>Email</button>
            <button onClick={()=>setTab('calls')} className={tab==='calls'? 'border-b-2 border-orange-500':''}>Calls</button>
          </nav>
        </div>
        <div className="h-[60vh] overflow-auto space-y-3">
          {thread.map((m:any)=> (
            <div key={m.id} className={`max-w-[60%] p-3 rounded ${m.from==='me'? 'ml-auto bg-orange-500 text-black':'bg-[#0f223a] text-gray-100'}`}>
              {m.subject && <div className="font-semibold">{m.subject}</div>}
              <div>{m.body}</div>
              <div className="text-xs text-gray-400 mt-1">{m.created_at}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input id="msginput" className="flex-1 bg-[#0f223a] p-2 rounded" />
          <button onClick={()=>{const v=(document.getElementById('msginput') as HTMLInputElement).value; sendMessage(v); (document.getElementById('msginput') as HTMLInputElement).value=''}} className="bg-orange-500 px-4 py-2 rounded">Send</button>
        </div>
      </div>
      <div className="w-1/4 bg-gray-800 p-4 rounded">
        {selected? (
          <div>
            <div className="text-lg font-semibold">{selected.contacts.name}</div>
            <div className="text-sm text-gray-400">{selected.contacts.email}</div>
            <div className="text-sm text-gray-400">{selected.contacts.phone}</div>
            <div className="mt-3">
              <button className="bg-gray-700 px-3 py-1 rounded">Enable auto-updates</button>
            </div>
          </div>
        ): (<div className="text-gray-400">Select a contact to view details</div>)}
      </div>
    </div>
  )
}
