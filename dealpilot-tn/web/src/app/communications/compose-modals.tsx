'use client'
import React, {useEffect, useState} from 'react'

export default function ComposeModals({onClose}:{onClose?:()=>void}){
  const [show,setShow]=useState(true)
  const [contacts,setContacts]=useState<any[]>([])
  const [recipient,setRecipient]=useState<string|number| null>(null)
  const [channel,setChannel]=useState<'sms'|'email'>('sms')
  const [templates,setTemplates]=useState<any[]>([])
  const [templateId,setTemplateId]=useState<string|null>(null)
  const [body,setBody]=useState('')
  const [subject,setSubject]=useState('')
  const [sendAt,setSendAt]=useState<string | null>(null)
  const [sending,setSending]=useState(false)

  useEffect(()=>{
    fetch('/api/communications/contacts?deal_id=all').then(r=>r.json()).then(j=>{ if(j.ok) setContacts(j.contacts||[]) }).catch(()=>setContacts([]))
    fetch('/api/communications/templates').then(r=>r.json()).then(j=>{ if(j.ok) setTemplates(j.templates||[]) }).catch(()=>setTemplates([]))
  },[])

  useEffect(()=>{
    if(templateId){
      const t = templates.find((x:any)=>x.id===templateId)
      if(t){ setBody(t.body||''); setSubject(t.subject||'') }
    }
  },[templateId,templates])

  async function send(){
    if(!recipient) return alert('Choose recipient')
    setSending(true)
    try{
      const payload:any = { contact_id: recipient, channel, message_body: body, template_id: templateId, deal_id: null, status: 'sent' }
      const r = await fetch('/api/communications/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      const j = await r.json()
      if(!r.ok) throw new Error(j?.error||'Failed')
      alert('Message sent')
      setShow(false)
      if(onClose) onClose()
    }catch(e:any){ alert('Send failed: '+String(e.message)) }
    setSending(false)
  }

  const smsChars = body.length
  const smsCount = Math.ceil(smsChars/160) || 0

  if(!show) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0f223a] p-6 rounded w-11/12 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Compose Message</h3>
          <button onClick={()=>{setShow(false); onClose && onClose()}} className="text-gray-400">Close</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 md:col-span-1">
            <label className="text-xs text-gray-300">To</label>
            <select className="w-full mt-1 bg-[#081224] p-2 rounded" value={recipient||''} onChange={e=>setRecipient(e.target.value||null)}>
              <option value="">Select recipient</option>
              {contacts.map((c:any)=> <option key={c.contact_id} value={c.contact_id}>{c.contacts?.name} — {c.role}</option>)}
            </select>
            <div className="mt-3">
              <label className="text-xs text-gray-300">Channel</label>
              <div className="mt-1 flex gap-2">
                <button onClick={()=>setChannel('sms')} className={`px-3 py-1 rounded ${channel==='sms'?'bg-orange-500 text-black':'bg-gray-700'}`}>SMS</button>
                <button onClick={()=>setChannel('email')} className={`px-3 py-1 rounded ${channel==='email'?'bg-orange-500 text-black':'bg-gray-700'}`}>Email</button>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs text-gray-300">Template</label>
              <select className="w-full mt-1 bg-[#081224] p-2 rounded" value={templateId||''} onChange={e=>setTemplateId(e.target.value||null)}>
                <option value="">(none)</option>
                {templates.map((t:any)=> <option key={t.id} value={t.id}>{t.name} • {t.channel}</option>)}
              </select>
            </div>
            <div className="mt-3">
              <label className="text-xs text-gray-300">Schedule send (optional)</label>
              <input type="datetime-local" className="w-full mt-1 bg-[#081224] p-2 rounded" onChange={e=>setSendAt(e.target.value||null)} />
            </div>
          </div>

          <div className="col-span-3 md:col-span-2">
            {channel==='email' && (<>
              <label className="text-xs text-gray-300">Subject</label>
              <input value={subject} onChange={e=>setSubject(e.target.value)} className="w-full mt-1 bg-[#081224] p-2 rounded" />
            </>)}
            <label className="text-xs text-gray-300 mt-3 block">Message</label>
            <textarea value={body} onChange={e=>setBody(e.target.value)} rows={8} className="w-full mt-1 bg-[#081224] p-2 rounded" />
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <div>Characters: {body.length} {channel==='sms' && `• SMS parts: ${smsCount}`}</div>
              <div>
                <button onClick={()=>{ if(recipient) { setBody('Hi {{client_name}}, quick update re: {{property_address}} — call to confirm.') }}} className="bg-gray-700 px-2 py-1 rounded mr-2">AI Suggest</button>
                <button onClick={send} disabled={sending} className="bg-orange-500 text-black px-3 py-1 rounded">{sending? 'Sending...':'Send'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
