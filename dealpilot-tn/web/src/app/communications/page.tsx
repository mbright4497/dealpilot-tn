'use client'
import React, {useEffect, useState, useRef} from 'react'

export default function CommunicationsPage(){
  const [contacts,setContacts]=useState<any[]>([])
  const [overdue,setOverdue]=useState<string[]>([])
  const [selected,setSelected]=useState<any>(null)
  const [logs,setLogs]=useState<any[]>([])
  const [templates,setTemplates]=useState<any[]>([])
  const [showTemplates,setShowTemplates]=useState(false)
  const inputRef = useRef<HTMLInputElement|null>(null)

  useEffect(()=>{
    fetch('/api/communications/contacts?deal_id=all').then(r=>r.json()).then(j=>{ if(j.ok) setContacts(j.contacts||[]) }).catch(()=>setContacts([]))
    fetch('/api/communications/templates').then(r=>r.json()).then(j=>{ if(j.ok) setTemplates(j.templates||[]) }).catch(()=>setTemplates([]))
    fetch('/api/communications/scheduler').then(r=>r.json()).then(j=>{ if(j.ok) setOverdue((j.overdue||[]).map((c:any)=>c.id)) }).catch(()=>setOverdue([]))
  },[])

  async function loadLogs(contact:any){
    setSelected(contact)
    const res = await fetch(`/api/communications/log?contact_id=${contact.contact_id}`)
    const j = await res.json()
    if(j.ok) setLogs(j.logs||[])
    else setLogs([])
  }

  return (<>
    <div className="min-h-screen bg-[#061021] text-gray-100 p-6 flex gap-4">
      <a href="/chat" className="mb-4 inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> ← Back
      </a>
      <div className="w-1/4 bg-gray-800 p-4 rounded">
        <div className="mb-3 text-gray-300">Contacts</div>
        {contacts.length===0 ? (
          <div className="text-gray-500">No contacts yet — add contacts from a deal page.</div>
        ) : (
          <div className="space-y-2">
            {contacts.map((c:any)=> (
              <button key={c.id} onClick={()=>loadLogs(c)} className="w-full text-left p-2 bg-[#0f223a] rounded">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white">{(c.contacts?.name||'')[0]||'?'}</div>
                  <div>
                    <div className="flex items-center gap-2"><div className="font-medium">{c.contacts?.name}</div>{overdue.includes(c.contact_id) && <div className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">Update due</div>}</div>
                    <div className="text-xs text-gray-400">{c.role}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 bg-gray-800 p-4 rounded">
        <div className="mb-3 text-gray-300">Conversation</div>
        <div className="mb-3">
          <button id="useTemplate" onClick={()=>setShowTemplates(true)} className="text-sm text-gray-300 bg-gray-700 px-2 py-1 rounded">Use Template</button>
        </div>
        {selected ? (
          <div>
            <div className="mb-2 font-semibold">{selected.contacts?.name}</div>
            <div className="h-[50vh] overflow-auto space-y-3">
              {logs.map((m:any)=> (
                <div key={m.id} className={`max-w-[60%] p-3 rounded ${m.direction==='outbound'? 'ml-auto bg-orange-500 text-black':'bg-[#0f223a] text-gray-100'}`}>
                  {m.subject && <div className="font-semibold">{m.subject}</div>}
                  <div>{m.body}</div>
                  <div className="text-xs text-gray-400 mt-1">{m.created_at}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Select a contact to view their communication log.</div>
        )}
      </div>

      <div className="w-1/4 bg-gray-800 p-4 rounded">
        <div className="text-gray-300">Contact Details</div>
        {selected ? (
          <div className="mt-3">
            <div className="font-semibold">{selected.contacts?.name}</div>
            <div className="text-sm text-gray-400">{selected.contacts?.email}</div>
            <div className="text-sm text-gray-400">{selected.contacts?.phone}</div>
            <div className="text-xs text-gray-500 mt-2">Role: {selected.role}</div>
          </div>
        ) : (<div className="text-gray-500 mt-3">No contact selected</div>)}
      </div>
    </div>
    {showTemplates && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
        <div className="bg-[#0f223a] p-4 rounded w-96">
          <h3 className="text-lg font-semibold">Templates</h3>
          <div className="mt-3 space-y-2 max-h-60 overflow-auto">
            {templates.map(t=> (
              <div key={t.id} className="p-2 bg-[#081224] rounded flex justify-between">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-gray-400">{t.category} • {t.channel}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={()=>{ if(inputRef.current) inputRef.current.value = t.body; setShowTemplates(false)}} className="bg-gray-700 px-2 py-1 rounded text-sm">Use</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-right">
            <button onClick={()=>setShowTemplates(false)} className="bg-gray-600 px-3 py-1 rounded">Close</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}