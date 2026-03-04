"use client"
import React, { useEffect, useState } from 'react'

export default function EmailDraftModal(){
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [to, setTo] = useState('')

  useEffect(()=>{
    const handler = (e:any)=>{
      const detail = e.detail || {}
      setOpen(true)
      setLoading(true)
      fetch('/api/eva/draft-email',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(detail)}).then(r=>r.json()).then(j=>{
        setSubject(j.subject||'')
        setBody(j.body||'')
        setTo(j.suggestedRecipient||'')
        setLoading(false)
      }).catch(()=>{ setLoading(false) })
    }
    window.addEventListener('eva:openEmailDraft', handler)
    return ()=> window.removeEventListener('eva:openEmailDraft', handler)
  },[])

  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={()=>setOpen(false)} />
      <div className="bg-slate-900 border border-slate-700 text-white p-6 rounded z-10 w-[720px]">
        <h3 className="text-lg font-semibold">AI Draft Email</h3>
        {loading ? <div className="mt-4">Generating...</div> : (
          <div className="mt-3 space-y-2">
            <div>
              <label className="text-sm">To</label>
              <input className="w-full bg-black p-2 rounded" value={to} onChange={(e)=>setTo(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Subject</label>
              <input className="w-full bg-black p-2 rounded" value={subject} onChange={(e)=>setSubject(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Body</label>
              <textarea className="w-full bg-black p-2 rounded" rows={8} value={body} onChange={(e)=>setBody(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <button className="bg-gray-700 px-3 py-1 rounded" onClick={()=>{ navigator.clipboard.writeText(`To: ${to}\nSubject: ${subject}\n\n${body}`); alert('Copied to clipboard') }}>Copy</button>
              <button className="bg-gray-600 px-3 py-1 rounded" onClick={()=>setOpen(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
