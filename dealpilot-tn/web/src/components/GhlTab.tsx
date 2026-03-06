'use client'
import React, { useEffect, useState } from 'react'

type Msg = {
  id: string
  comm_type: string
  direction?: string
  recipient?: string
  subject?: string
  body?: string
  status?: string
  created_at?: string
  metadata?: any
}

export default function GhlTab({ dealId, userId }: { dealId: string, userId: string }){
  const [messages, setMessages] = useState<Msg[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ channel: 'ghl_sms', contactId: '', to: '', subject: '', message: '' })

  async function fetchMessages(){
    if(!dealId) return
    setLoading(true)
    try{
      const res = await fetch(`/api/communications?deal_id=${encodeURIComponent(dealId)}`)
      if(!res.ok){ setError('Failed to load messages'); setLoading(false); return }
      const j = await res.json()
      const ghls = (j.communications || []).filter((c: any) => String(c.comm_type || '').startsWith('ghl_'))
      setMessages(ghls)
    }catch(e:any){ setError(String(e)) }
    setLoading(false)
  }

  useEffect(()=>{ fetchMessages() },[dealId])

  async function handleSend(){
    setError(null)
    setSending(true)
    try{
      const payload:any = {
        comm_type: form.channel === 'ghl_email' ? 'email' : 'sms',
        deal_id: dealId,
        contact_id: form.contactId,
        recipient: form.to,
        subject: form.channel === 'ghl_email' ? form.subject : undefined,
        body: form.message,
        ai_generated: false,
      }
      const res = await fetch('/api/ghl/send', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const j = await res.json()
      if(!res.ok || j.error){ setError(j.error || 'Send failed'); setSending(false); return }
      setForm({ channel: form.channel, contactId: '', to: '', subject: '', message: '' })
      await fetchMessages()
    }catch(e:any){ setError(String(e)) }
    setSending(false)
  }

  const empty = !loading && messages.length === 0

  return (
    <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-lg font-semibold text-white">GHL Messaging</h4>
        <div className="text-sm text-gray-400">{messages.length} messages</div>
      </div>

      <div className="h-64 overflow-y-auto space-y-3">
        {loading && <div className="text-sm text-gray-400">Loading…</div>}
        {empty && <div className="text-sm text-gray-500">No GHL messages yet.</div>}
        {messages.map((m) => (
          <div key={m.id} className="p-3 bg-white/3 backdrop-blur-sm rounded-xl border border-white/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">{m.comm_type?.replace('ghl_','').toUpperCase() || 'GHL'}</div>
                <div className="text-xs text-gray-300 mt-1">{m.recipient || '—'}</div>
                {m.subject && <div className="text-sm text-gray-200 mt-1 font-semibold">{m.subject}</div>}
                <div className="text-sm text-gray-300 mt-1">{m.body ? m.body.slice(0,200) : '—'}</div>
              </div>
              <div className="text-right">
                <div className={`text-xs px-2 py-1 rounded-full ${m.status === 'sent' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : m.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : m.status === 'failed' ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-gray-500/10 text-gray-300 border border-gray-500/20'}`}>{m.status || 'draft'}</div>
                <div className="text-xs text-gray-400 mt-1">{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/5">
        <div className="grid grid-cols-1 gap-2">
          <div className="flex gap-2">
            <select value={form.channel} onChange={e=>setForm({...form, channel: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white">
              <option value="ghl_sms">GHL SMS</option>
              <option value="ghl_email">GHL Email</option>
              <option value="ghl_call">GHL Call</option>
            </select>
            <input value={form.contactId} onChange={e=>setForm({...form, contactId: e.target.value})} placeholder="Contact ID" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
            <input value={form.to} onChange={e=>setForm({...form, to: e.target.value})} placeholder="To (phone/email)" className="w-64 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
          </div>
          {form.channel === 'ghl_email' && (
            <input value={form.subject} onChange={e=>setForm({...form, subject: e.target.value})} placeholder="Subject" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
          )}
          <textarea value={form.message} onChange={e=>setForm({...form, message: e.target.value})} rows={4} placeholder="Message" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
          {error && <div className="text-sm text-red-400">{error}</div>}
          <div className="flex justify-end gap-2">
            <button onClick={fetchMessages} className="px-3 py-2 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10">Refresh</button>
            <button onClick={handleSend} disabled={sending} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-400 hover:to-purple-400 transition-all">{sending ? 'Sending…' : 'Send'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
