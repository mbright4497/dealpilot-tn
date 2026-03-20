'use client'
import React, {useEffect, useState} from 'react'
import fs from 'fs'

export default function MissionControl(){
  const [agents, setAgents] = useState<any[]>([])

  useEffect(()=>{
    async function load(){
      try{
        const res = await fetch('/api/subagents/registry')
        if(res.ok){ const j = await res.json(); setAgents(Object.values(j)) }
      }catch(e){ console.warn('load registry failed', e) }
    }
    load()
  }, [])

  return (
    <div className="p-6 bg-[#0f172a] min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Mission Control</h1>
      <p className="text-sm text-gray-300 mb-6">Sub-agent registry & current status</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((a:any)=> (
          <div key={a.slug} className="p-4 rounded-lg bg-[#061021] border border-white/6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-lg font-semibold">{a.id || a.slug} — {a.name}</div>
                <div className="text-xs text-gray-400">{a.role} • owner: {a.owner}</div>
              </div>
              <div className="text-sm text-gray-300">{a.runtime}</div>
            </div>
            <div className="text-sm text-gray-300">{a.description || a.notes}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 text-sm text-gray-400">Mission Control is read-only in this branch. Use orchestration endpoints to spawn/stop agents and view live logs.</div>
    </div>
  )
}
