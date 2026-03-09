'use client'
import React, { useEffect, useState } from 'react'

type Comm = {
  id: string
  deal_id?: string
  user_id?: string
  comm_type: 'email'|'sms'|'call'|'note'
  direction?: 'inbound'|'outbound'
  recipient?: string|null
  subject?: string|null
  body?: string|null
  status?: string
  ai_generated?: boolean
  metadata?: any
  created_at?: string
}

export default function CommHub({ dealId }:{ dealId: string }){
  const [comms, setComms] = useState<Comm[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all'|'email'|'sms'|'call'>('all')
  const [showCompose, setShowCompose] = useState(false)
  const [form, setForm] = useState({ comm_type: 'email', recipient: '', subject: '', body: '', ai_generated: false })
  const [error, setError] = useState<string| null>(null)
  const [contactsGrouped, setContactsGrouped] = useState<any>({})

  async function fetchComms(){
    if(!dealId) return
    setLoading(true)
    try{
      const res = await fetch(`/api/communications?deal_id=${encodeURIComponent(dealId)}`)
      if(!res.ok){ setError('Failed to load communications'); setLoading(false); return }
      const j = await res.json()
      setComms(j.communications || [])
    }catch(e:any){ setError(String(e)) }
    setLoading(false)
  }

  async function fetchHub(){
    if(!dealId) return
    try{
      const res = await fetch(`/api/communications/hub?deal_id=${encodeURIComponent(dealId)}`)
      if(!res.ok) return
      const j = await res.json()
      setContactsGrouped(j.grouped || {})
    }catch(e){}
  }

  useEffect(()=>{ fetchComms(); fetchHub() },[dealId])

  async function handleSend(saveAsDraft = false){
    setError(null)
    try{
      const payload:any = {
        deal_id: dealId,
        comm_type: form.comm_type,
        direction: 'outbound',
        recipient: form.recipient || null,
        subject: form.comm_type === 'email' ? form.subject || null : null,
        body: form.body || null,
        status: saveAsDraft ? 'draft' : 'sent',
        ai_generated: !!form.ai_generated,
      }
      const res = await fetch('/api/communications', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const j = await res.json()
      if(!res.ok || j.error){ setError(j.error || 'Failed to save'); return }
      setShowCompose(false)
      setForm({ comm_type: 'email', recipient: '', subject: '', body: '', ai_generated: false })
      await fetchComms()
    }catch(e:any){ setError(String(e)) }
  }

  const filtered = comms.filter(c => filter === 'all' ? true : c.comm_type === filter)

  function statusClasses(s?: string){
    switch(s){
      case 'draft': return 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
      case 'sent': return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
      case 'delivered': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
      case 'failed': return 'bg-red-500/10 text-red-300 border border-red-500/20'
      default: return 'bg-gray-500/10 text-gray-300 border border-gray-500/20'
    }
  }

  return (
    <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg flex gap-4">
      <div className="w-64">
        <h4 className="text-sm font-semibold text-white mb-2">Contacts</h4>
        {Object.keys(contactsGrouped).length === 0 && <div className="text-xs text-gray-400">No contacts</div>}
        <div className="space-y-2 max-h-96 overflow-auto">
          {Object.entries(contactsGrouped).map(([role, list]:any) => (
            <div key={role}>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{role}</div>
              {list.map((c:any)=> (
                <button key={c.id} onClick={()=>{ setForm({...form, recipient: c.email || c.phone || c.name}); setShowCompose(true) }} className="w-full text-left px-2 py-1 rounded hover:bg-white/5 text-sm text-gray-300">{c.name} <span className="text-xs text-gray-500">{c.email || c.phone}</span></button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Communications Hub</h3>
            <p className="text-sm text-gray-400">Manage messages & outreach for this deal</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex bg-white/5 border border-white/10 rounded-xl p-1">
              {['all','email','sms','call'].map(t=> (
                <button key={t} onClick={()=>setFilter(t as any)} className={`px-3 py-1 text-sm ${filter===t? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-gray-300' } rounded-lg`}>{t.toUpperCase()}</button>
              ))}
            </div>
            <button onClick={()=>setShowCompose(true)} className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl hover:from-cyan-400 hover:to-purple-400 transition-all">New Communication</button>
          </div>
        </div>

        <div>
          {loading && <div className="text-sm text-gray-400">Loading…</div>}
          {!loading && filtered.length === 0 && <div className="text-sm text-gray-500">No communications</div>}
          <div className="space-y-3 mt-3">
            {filtered.map(c => (
              <div key={c.id} className="p-3 bg-white/3 backdrop-blur-sm rounded-xl border border-white/5 flex items-start gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-cyan-700 to-purple-700 text-white font-bold">{c.comm_type === 'email' ? '✉️' : c.comm_type === 'sms' ? '💬' : c.comm_type === 'call' ? '📞' : '📝'}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">{c.recipient || '—'}</div>
                      <div className="text-xs text-gray-400">{c.comm_type === 'email' && c.subject ? c.subject : (c.body ? (c.body.slice(0,80)) : '')}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs px-2 py-1 rounded-full ${statusClasses(c.status)}`}>{c.status || 'draft'}</div>
                      <div className="text-xs text-gray-400 mt-1">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-white">New Communication</h4>
              <button onClick={()=>setShowCompose(false)} className="text-gray-400 hover:text-white">×</button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex gap-2">
                <select value={form.comm_type} onChange={e=>setForm({...form, comm_type: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="call">Call</option>
                  <option value="note">Note</option>
                </select>
                <input value={form.recipient} onChange={e=>setForm({...form, recipient: e.target.value})} placeholder="Recipient name or contact" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
              </div>
              {form.comm_type === 'email' && (
                <input value={form.subject} onChange={e=>setForm({...form, subject: e.target.value})} placeholder="Subject" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
              )}
              <textarea value={form.body} onChange={e=>setForm({...form, body: e.target.value})} rows={6} placeholder="Message body" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
              <label className="inline-flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={form.ai_generated} onChange={e=>setForm({...form, ai_generated: e.target.checked})} /> AI generated</label>

              {error && <div className="text-sm text-red-400">{error}</div>}

              <div className="flex items-center gap-3 justify-end">
                <button onClick={()=>handleSend(true)} className="px-4 py-2 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition-all">Save Draft</button>
                <button onClick={()=>handleSend(false)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-400 hover:to-purple-400 transition-all">Send</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
