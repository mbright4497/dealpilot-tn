'use client'
import React, {useState} from 'react'
export default function ComposeModals(){
  const [show,setShow]=useState(false)
  const [to,setTo]=useState('')
  const [subject,setSubject]=useState('')
  const [body,setBody]=useState('')
  const [sending,setSending]=useState(false)
  return (
    <div>
      <button onClick={()=>setShow(true)} title="New Conversation" className="fixed bottom-6 right-6 bg-orange-500 text-black w-14 h-14 rounded-full shadow-lg animate-pulse">+</button>
      {show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-[#0f223a] p-4 rounded w-96">
            <h3 className="text-lg font-semibold">New Message</h3>
            <div className="mt-3">
              <label className="text-sm text-gray-300">To</label>
              <input value={to} onChange={e=>setTo(e.target.value)} className="w-full mt-1 bg-[#1a1a2e] p-2 rounded" />
            </div>
            <div className="mt-2">
              <label className="text-sm text-gray-300">Subject</label>
              <input value={subject} onChange={e=>setSubject(e.target.value)} className="w-full mt-1 bg-[#1a1a2e] p-2 rounded" />
            </div>
            <div className="mt-2">
              <label className="text-sm text-gray-300">Message</label>
              <textarea value={body} onChange={e=>setBody(e.target.value)} rows={6} className="w-full mt-1 bg-[#1a1a2e] p-2 rounded" />
              <div className="text-xs text-gray-400 mt-1">{body.length} characters</div>
            </div>
            <div className="mt-3 text-right">
              <button onClick={async ()=>{setSending(true); await new Promise(r=>setTimeout(r,600)); setSending(false); setShow(false)}} className="bg-orange-500 text-black px-4 py-2 rounded">{sending? 'Sending...':'Send'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
