'use client'
import React, {useEffect, useState} from 'react'

export default function MissionControl(){
  const [agents, setAgents] = useState<any[]>([])
  const [status, setStatus] = useState<Record<string, any>>({})
  const [selected, setSelected] = useState<any|null>(null)

  useEffect(()=>{
    async function load(){
      try{
        const res = await fetch('/api/subagents/registry')
        if(res.ok){ const j = await res.json(); setAgents(Object.values(j)) }
      }catch(e){ console.warn('load registry failed', e) }
    }
    load()
  }, [])

  useEffect(()=>{
    async function loadStatus(){
      try{
        const res = await fetch('/api/subagents/status')
        if(res.ok){ const j = await res.json(); setStatus(j) }
      }catch(e){ console.warn('load status failed', e) }
    }
    loadStatus()
    const id = setInterval(loadStatus, 5000)
    return ()=>clearInterval(id)
  }, [])

  return (
    <div className="p-6 bg-[#0f172a] min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Mission Control</h1>
      <p className="text-sm text-gray-300 mb-6">Sub-agent registry & live status — click a tile for details</p>

      {/* Chessboard-style grid */}
      <div className="grid grid-cols-4 gap-3">
        {agents.map((a:any, idx:number)=>{
          const s = status[a.slug] || status[a.id] || {} 
          const state = s.status || 'idle'
          const color = state === 'running' ? 'bg-green-600' : state === 'idle' ? 'bg-gray-700' : state === 'offline' ? 'bg-red-700' : 'bg-yellow-600'
          return (
            <button key={a.slug||idx} onClick={()=>setSelected({agent:a, state:s})} className={`relative h-28 rounded-lg p-3 text-left flex flex-col justify-between border border-white/8 ${color}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-semibold text-white">{a.id || a.slug}</div>
                  <div className="text-xs text-gray-200">{a.name}</div>
                </div>
                <div className="text-xs text-gray-100">{a.runtime}</div>
              </div>
              <div className="text-xs text-gray-100 opacity-90">{s.task ? String(s.task).slice(0,40) : (s.status || 'idle')}</div>
            </button>
          )
        })}
      </div>

      {/* Details modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="w-full max-w-2xl bg-[#061021] p-4 rounded-lg border border-white/10">
            <div className="flex justify-between items-center mb-3">
              <div>
                <div className="font-semibold text-lg">{selected.agent.name} ({selected.agent.id || selected.agent.slug})</div>
                <div className="text-xs text-gray-400">owner: {selected.agent.owner} • role: {selected.agent.role}</div>
              </div>
              <div>
                <button onClick={()=>setSelected(null)} className="px-3 py-1 bg-gray-800 rounded">Close</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-300 mb-2">Current Status</div>
                <div className="p-3 bg-[#0d1b2a] rounded">
                  <div>Status: <strong className="ml-2">{selected.state.status || 'idle'}</strong></div>
                  <div>Task: <span className="ml-2">{selected.state.task || '—'}</span></div>
                  <div>Last seen: <span className="ml-2">{selected.state.lastSeen || '—'}</span></div>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-300 mb-2">Actions</div>
                <div className="p-3 bg-[#0d1b2a] rounded space-y-2">
                  <button className="w-full px-3 py-2 bg-orange-500 text-black rounded">Request status update</button>
                  <button className="w-full px-3 py-2 bg-gray-800 rounded">Open logs</button>
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-300">Details: {JSON.stringify(selected.state, null, 2)}</div>
          </div>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-400">Tip: this view updates every 5s. I can add live log streaming and task claim/release endpoints next.</div>
    </div>
  )
}
