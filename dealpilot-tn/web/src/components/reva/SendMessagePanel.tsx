"use client"
import React, {useState} from 'react'
import { TEMPLATES } from '@/lib/eva/message-templates'

export default function SendMessagePanel({dealId}:{dealId:number}){
  const [channel, setChannel] = useState<'sms'|'email'|'whatsapp'>('sms')
  const [template, setTemplate] = useState<string>('deadline_reminder')
  const [draft, setDraft] = useState<{subject?:string, body:string}|null>(null)
  const [loading, setLoading] = useState(false)

  async function generate(){
    setLoading(true)
    try{
      const res = await fetch('/api/eva/compose-message', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ transactionId: dealId, contactName: '', contactRole: 'buyer', messageType: channel==='email'?'email':'sms', purpose: template }) })
      const j = await res.json()
      setDraft({ subject: j.subject, body: j.body })
    }catch(e){ console.error(e); alert('Failed to generate') }
    setLoading(false)
  }

  async function send(){
    if(!draft) return
    setLoading(true)
    try{
      const res = await fetch('/api/eva/send', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ dealId, contactId: 'TODO_CONTACT', channel, templateKey: template, customMessage: draft.body }) })
      const j = await res.json()
      if(j.error) alert('Send failed: '+j.error)
      else alert('Sent')
    }catch(e){ console.error(e); alert('Send failed') }
    setLoading(false)
  }

  return (
    <div className="p-4 bg-gray-900 rounded">
      <div className="flex gap-2 mb-3">
        <button onClick={()=>setChannel('sms')} className={`px-3 py-1 rounded ${channel==='sms'?'bg-orange-500 text-black':'bg-gray-800 text-gray-300'}`}>SMS</button>
        <button onClick={()=>setChannel('email')} className={`px-3 py-1 rounded ${channel==='email'?'bg-orange-500 text-black':'bg-gray-800 text-gray-300'}`}>Email</button>
        <button onClick={()=>setChannel('whatsapp')} className={`px-3 py-1 rounded ${channel==='whatsapp'?'bg-orange-500 text-black':'bg-gray-800 text-gray-300'}`}>WhatsApp</button>
      </div>

      <div className="mb-3">
        <select value={template} onChange={e=>setTemplate(e.target.value)} className="w-full bg-gray-800 rounded px-3 py-2 text-white">
          {Object.keys(TEMPLATES).map(k=>(<option key={k} value={k}>{k}</option>))}
        </select>
      </div>

      <div className="mb-3">
        <button onClick={generate} className="px-4 py-2 bg-orange-500 rounded">Generate Draft</button>
        <button onClick={send} className="ml-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded">Send via GHL</button>
      </div>

      <div className="mb-3 p-3 bg-gray-800 rounded">
        <h4 className="text-sm text-gray-300">Preview</h4>
        <div className="text-sm text-gray-200 mt-2 whitespace-pre-wrap">{draft? draft.body : 'No draft generated'}</div>
      </div>

    </div>
  )
}
