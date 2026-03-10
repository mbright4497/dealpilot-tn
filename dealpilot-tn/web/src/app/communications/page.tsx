'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function CommunicationsPage(){
  const [contacts,setContacts]=useState<any[]>([])
  const [selected,setSelected]=useState<any>(null)
  const [history,setHistory]=useState<any[]>([])
  const [tab,setTab]=useState<'all'|'sms'|'email'>('all')
  const [query,setQuery]=useState('')
  const [showCompose,setShowCompose]=useState(false)
  const [recent]=useState<any[]>([])
  const [composeChannel,setComposeChannel]=useState<'sms'|'email'>('sms')
  const [composeSubject,setComposeSubject]=useState('')
  const [composeBody,setComposeBody]=useState('')
  const [composeError,setComposeError]=useState('')
  const [composeStatus,setComposeStatus]=useState('')
  const [composeLoading,setComposeLoading]=useState(false)
  const [loading,setLoading]=useState(false)
  const router = useRouter()

  useEffect(()=>{ fetch('/api/communications/contacts?deal_id=all').then(r=>r.json()).then(j=>{ if(j.ok) setContacts(j.contacts||[]) }).catch(()=>setContacts([])) },[])

  const openComposeModal = (channel: 'sms'|'email' = 'sms') => {
    setComposeChannel(channel)
    setComposeStatus('')
    setComposeError('')
    setComposeBody('')
    setComposeSubject('')
    setShowCompose(true)
  }

  const closeComposeModal = () => {
    setComposeLoading(false)
    setShowCompose(false)
    setComposeStatus('')
    setComposeError('')
  }

  async function loadHistory(contact:any){
    if(!contact) return
    setSelected(contact)
    const id = contact.contact_id || contact.contacts?.id
    if(!id) return
    const params = new URLSearchParams({ contact_id: id })
    if(contact.deal_id) params.set('deal_id', contact.deal_id)
    const res = await fetch(`/api/communications/history?${params.toString()}`)
    const j = await res.json()
    if(j.ok) setHistory(j.history||[])
    else setHistory([])
  }

  async function handleComposeSend(){
    if(!selected){
      setComposeError('Please select a contact before sending')
      return
    }
    const contactId = selected.contact_id || selected.contacts?.id
    const recipient = composeChannel==='sms' ? selected.contacts?.phone : selected.contacts?.email
    if(!contactId || !recipient){
      setComposeError('Selected contact is missing recipient info')
      return
    }
    if(!composeBody.trim()){
      setComposeError('Message body cannot be empty')
      return
    }

    setComposeLoading(true)
    setComposeError('')
    setComposeStatus('')

    try{
      const payload = {
        contact_id: contactId,
        deal_id: selected.deal_id || null,
        channel: composeChannel,
        recipient,
        message: composeBody.trim(),
        subject: composeChannel === 'email' ? composeSubject : undefined,
      }
      const res = await fetch('/api/communications/send', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const json = await res.json()
      if(!res.ok || !json.ok){
        setComposeError(json.error || 'Failed to send message')
      } else {
        setComposeStatus(`Queued via ${json.provider || 'GHL'} (${json.status})${json.connected ? '' : ' – mock mode'}`)
        setComposeBody('')
        if(composeChannel === 'email') setComposeSubject('')
        await loadHistory(selected)
      }
    }catch(e:any){
      setComposeError(e.message || 'Unable to connect to the API')
    }finally{
      setComposeLoading(false)
    }
  }

  const filtered = contacts.filter(c=> (c.contacts?.name||'').toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="min-h-screen bg-[#061021] text-gray-100 p-6">
      <a href="/chat" className="mb-4 inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        ← Back
      </a>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3 bg-gray-800 p-4 rounded card">
          <div className="flex items-center gap-2 mb-3">
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search contacts" className="flex-1 bg-[#0f223a] p-2 rounded input" />
            <button onClick={()=>openComposeModal()} className="bg-orange-500 text-black px-3 py-1 rounded">+</button>
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

        <div className="col-span-6 bg-gray-800 p-4 rounded card flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button onClick={()=>setTab('all')} className={`px-3 py-1 rounded ${tab==='all'?'border-b-2 border-orange-500':''}`}>All</button>
              <button onClick={()=>setTab('sms')} className={`px-3 py-1 rounded ${tab==='sms'?'border-b-2 border-orange-500':''}`}>SMS</button>
              <button onClick={()=>setTab('email')} className={`px-3 py-1 rounded ${tab==='email'?'border-b-2 border-orange-500':''}`}>Email</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>openComposeModal()} className="bg-orange-500 text-black px-3 py-1 rounded">Compose</button>
            </div>
          </div>

          <div className="flex-1 overflow-auto space-y-3" style={{minHeight:300}}>
            {/* Empty state when there are no conversations */}
            {!loading && history.length===0 && !selected && (
              <div className="text-center py-10">
                <div className="text-lg font-semibold text-white mb-2">No conversations yet</div>
                <div className="text-sm text-gray-400 mb-4">Connect your GHL account in Settings to sync contacts, or ask Eva to draft a message.</div>
                <div className="flex justify-center">
                  <button onClick={()=>{ const router = useRouter(); router.push('/chat'); setTimeout(()=>{ if(typeof window !== 'undefined') localStorage.setItem('eva_prefill','Draft a message to introduce myself and ask about missing documents') },300) }} className="px-4 py-2 bg-orange-500 rounded">Ask Eva to draft a message</button>
                </div>
              </div>
            )}

            {selected ? (
              history.filter((h:any)=> tab==='all' || h.channel===tab).map((m:any)=> (
                <div key={m.id} className={`max-w-[70%] p-3 rounded ${m.from_agent? 'ml-auto bg-teal-600 text-black':'bg-[#0f223a] text-gray-100'}`}>
                  <div className="text-xs text-gray-300">{(m.channel||'').toUpperCase()} • {new Date(m.sent_at||m.created_at||Date.now()).toLocaleString()}</div>
                  {m.subject && <div className="font-semibold">{m.subject}</div>}
                  <div className="mt-1">{m.body}</div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[0.65rem] text-gray-300">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${m.status==='failed' ? 'bg-red-600 text-white' : 'bg-emerald-300 text-black'}`}>
                      {(m.status||'sent').toUpperCase()}
                    </span>
                    <span className="uppercase text-[0.6rem] tracking-wide text-gray-400">{(m.provider||'ghl').toString().replace(/_/g,' ')}</span>
                  </div>
                  {m.provider_response?.error && <div className="text-[0.65rem] text-orange-300 mt-1">Error: {String(m.provider_response.error || m.provider_response)}</div>}
                </div>
              ))
            ) : (
              <div className="text-gray-500">Select a contact to view the conversation</div>
            )}
          </div>

          <div className="mt-3">
            {/* quick compose bar placeholder */}
          </div>
        </div>

        <div className="col-span-3 bg-gray-800 p-4 rounded card">
          {selected ? (
            <>
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
                <button onClick={()=>openComposeModal('sms')} className="bg-gray-700 px-3 py-1 rounded">SMS</button>
                <button onClick={()=>openComposeModal('email')} className="bg-gray-700 px-3 py-1 rounded">Email</button>
              </div>

              <div className="mt-4 border-t border-gray-700 pt-3 text-sm text-gray-300">
                <div className="font-semibold mb-2">Activity</div>
                <div className="space-y-2 max-h-40 overflow-auto">
                  {recent.length === 0 ? (
                    <div className="text-xs text-gray-500">No recent activity</div>
                  ) : (
                    recent.map(r=> (
                      <div key={r.id} className="flex items-center justify-between bg-[#081224] p-2 rounded">
                        <div><div className="font-medium">{r.contact_name}</div><div className="text-xs text-gray-400">{r.summary}</div></div>
                        <div className="text-xs text-gray-400">{new Date(r.sent_at||r.created_at).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button onClick={()=>openComposeModal('sms')} className="bg-gray-700 px-3 py-1 rounded">Quick Reply</button>
                <button onClick={()=>openComposeModal('sms')} className="bg-gray-700 px-3 py-1 rounded">Schedule showing</button>
                <button onClick={()=>openComposeModal('email')} className="bg-gray-700 px-3 py-1 rounded">Send update</button>
              </div>
            </>
          ) : (
            <div className="text-gray-500">No contact selected</div>
          )}
        </div>
      </div>

      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-white/10 bg-[#0c1628] p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase text-gray-400">{composeChannel === 'sms' ? 'Send SMS' : 'Send Email'}</div>
                <div className="text-lg font-semibold">{selected?.contacts?.name || 'Select a contact'}</div>
                <div className="text-xs text-gray-500">{composeChannel === 'sms' ? selected?.contacts?.phone : selected?.contacts?.email}</div>
              </div>
              <button onClick={closeComposeModal} className="text-gray-400 hover:text-white">Close</button>
            </div>

            <div className="flex gap-2">
              <button onClick={()=>setComposeChannel('sms')} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${composeChannel==='sms' ? 'border-orange-400 text-white' : 'border-white/10 text-gray-300'}`}>SMS</button>
              <button onClick={()=>setComposeChannel('email')} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${composeChannel==='email' ? 'border-orange-400 text-white' : 'border-white/10 text-gray-300'}`}>Email</button>
            </div>

            {composeChannel==='email' && (
              <input value={composeSubject} onChange={e=>setComposeSubject(e.target.value)} placeholder="Subject" className="w-full rounded-lg border border-white/10 bg-[#081224] px-3 py-2 text-sm text-white" />
            )}

            <textarea rows={5} value={composeBody} onChange={e=>setComposeBody(e.target.value)} placeholder={composeChannel==='sms' ? 'Write a quick SMS...' : 'Write an email...' } className="w-full rounded-lg border border-white/10 bg-[#081224] px-3 py-2 text-sm text-white" />

            {composeStatus && <div className="text-sm text-emerald-300">{composeStatus}</div>}
            {composeError && <div className="text-sm text-red-400">{composeError}</div>}

            <div className="flex justify-end gap-2">
              <button onClick={closeComposeModal} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white">Cancel</button>
              <button onClick={handleComposeSend} disabled={composeLoading} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">{composeLoading ? 'Sending…' : `Send ${composeChannel === 'sms' ? 'SMS' : 'Email'}`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
