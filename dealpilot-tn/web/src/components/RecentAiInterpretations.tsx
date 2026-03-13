"use client"
import React, {useEffect, useState} from 'react'

export default function RecentAiInterpretations({ data }:{ data?: any[] }){
  const [mounted, setMounted] = useState(false)
  useEffect(()=>{ setMounted(true) },[])
  if(!mounted) return (<div className="p-2 text-sm text-gray-400">Loading interpretations…</div>)
  if(!Array.isArray(data) || data.length===0) return (<div className="text-sm text-gray-400">No recent AI classifications.</div>)
  return (
    <div className="space-y-2">
      {data.map((r:any,i:number)=>{
        const ts = new Date(r.created_at || Date.now()).toLocaleString()
        return (
          <div key={r.id || i} className="p-2 bg-[#0d1624] rounded">
            <div className="text-xs text-gray-400">{ts} • {String(r.recipient || '')}</div>
            <div className="mt-1 text-sm text-white">{String(r.message || '')}</div>
            <div className="mt-1 text-xs text-amber-300"><pre className="whitespace-pre-wrap">{JSON.stringify(r.metadata?.ai || r.metadata || {}, null, 2)}</pre></div>
          </div>
        )
      })}
    </div>
  )
}
