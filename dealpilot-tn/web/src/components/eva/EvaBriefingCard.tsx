"use client"
import React, { useEffect, useState } from 'react'

export default function EvaBriefingCard(){
  const [loading,setLoading] = useState(true)
  const [msg,setMsg] = useState<string>('')
  const [chips,setChips] = useState<string[]>([])

  useEffect(()=>{
    let mounted = true
    fetch('/api/eva/briefing',{method:'POST'}).then(r=>r.json()).then(j=>{
      if(!mounted) return
      setMsg(j.message)
      setChips(j.chips||[])
      setLoading(false)
    }).catch(()=>{ if(mounted){ setMsg('EVA briefing unavailable'); setLoading(false)} })
    return ()=>{ mounted=false }
  },[])

  if(loading) return (<div className="bg-[#0f1c2e] border border-[#1e3a5f] rounded-xl p-6 animate-pulse">Loading briefing...</div>)

  return (
    <div onClick={()=>{ /* open EVA */ }} className="bg-[#0f1c2e] border border-[#1e3a5f] rounded-xl p-6 cursor-pointer">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center font-bold">★</div>
        <div className="flex-1">
          <div className="text-gray-200 leading-relaxed">{msg}</div>
          <div className="mt-3 flex gap-2">
            {chips.map(c=> (<div key={c} className="bg-[#1e3a5f] text-gray-300 px-3 py-1 rounded-full text-sm">{c}</div>))}
          </div>
        </div>
      </div>
    </div>
  )
}
