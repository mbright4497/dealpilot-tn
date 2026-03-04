"use client"
import React, { useEffect, useState } from 'react'

export default function DeadlinePlaybookView({ transactionId }:{ transactionId:string }){
  const [deadlines, setDeadlines] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])

  useEffect(()=>{
    async function load(){
      const res = await fetch(`/api/deals/${transactionId}/timeline`)
      if(!res.ok) return
      const j = await res.json()
      setDeadlines(j.deadlines||[])
      setItems(j.checklist||[])
    }
    load()
  },[transactionId])

  function colorFor(d:any){
    if(d.status==='complete') return 'bg-gray-600'
    if(d.status==='overdue') return 'bg-red-600'
    if(d.status==='due' || (d.due_at && new Date(d.due_at) < new Date(Date.now()+3*24*3600*1000))) return 'bg-yellow-500'
    return 'bg-green-600'
  }

  return (
    <div className="bg-[#0a1929] text-white p-4 rounded">
      <h3 className="text-lg font-semibold mb-3">Deadline Playbook</h3>
      <div className="space-y-2">
        {deadlines.map(d=> (
          <div key={d.id} className="p-3 rounded border border-slate-700 flex justify-between items-center">
            <div>
              <div className="font-medium">{d.label}</div>
              <div className="text-sm text-gray-400">{d.source} • {d.code}</div>
            </div>
            <div className="text-right">
              <div className={`px-3 py-1 rounded text-sm ${colorFor(d)}`}>{new Date(d.due_at).toLocaleDateString()}</div>
              <div className="text-xs text-gray-400 mt-1">{d.owner_role || ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
