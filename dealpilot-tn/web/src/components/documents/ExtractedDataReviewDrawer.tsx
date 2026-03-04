"use client"
import React, { useEffect, useState } from 'react'

export default function ExtractedDataReviewDrawer({ extraction, transactionId }:{ extraction:any, transactionId?:string }){
  const [open, setOpen] = useState(!!extraction)
  const [values, setValues] = useState<any>(extraction?.extraction_json || {})

  useEffect(()=>{ setOpen(!!extraction); setValues(extraction?.extraction_json || {}) },[extraction])

  async function apply(){
    if(!transactionId || !extraction) return alert('missing')
    const res = await fetch('/api/ai/deals/apply-extraction',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ transaction_id: transactionId, extraction_id: extraction.id }) })
    const j = await res.json()
    if(!res.ok) return alert(j.error||'apply failed')
    alert('Applied')
    // redirect
    window.location.href = `/dashboard/deals/${transactionId}`
  }

  if(!open) return null
  return (
    <div className="fixed right-0 top-0 h-full w-[480px] bg-[#0a1929] border-l border-slate-700 z-50 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Extraction Review</h3>
        <button onClick={()=>setOpen(false)}>Close</button>
      </div>
      <div className="space-y-3 overflow-y-auto h-[80%]">
        {Object.entries(values).map(([k,v]:any)=>(
          <div key={k} className="bg-[#071022] p-3 rounded">
            <div className="text-sm text-gray-300 font-medium">{k}</div>
            <input className="w-full bg-black p-2 rounded mt-2" value={v} onChange={(e)=>setValues((s:any)=>({...s,[k]: e.target.value}))} />
            <div className="mt-2 flex gap-2"><button className="px-2 py-1 bg-green-600 rounded">Accept</button><button className="px-2 py-1 bg-gray-700 rounded">Edit</button></div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end"><button onClick={apply} className="bg-orange-500 px-4 py-2 rounded">Apply to Deal</button></div>
    </div>
  )
}
