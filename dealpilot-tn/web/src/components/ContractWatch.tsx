'use client'
import React, { useEffect, useState } from 'react'

type Milestone = { label: string; dueDate: string | null; daysRemaining: number | null; status: string }

export default function ContractWatch(){
  const [data, setData] = useState<{ address: string; milestones: Milestone[] }[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        const res = await fetch('/api/contract-watch')
        if(!res.ok) { setData([]); setLoading(false); return }
        const j = await res.json()
        if(!mounted) return
        setData(j.results || [])
      }catch(e){ console.error(e); setData([]) }
      setLoading(false)
    })()
    return ()=>{ mounted=false }
  },[])

  function daysClass(d:number|null){
    if (d === null) return 'text-gray-400'
    if (d < 3) return 'text-red-400'
    if (d <= 7) return 'text-amber-300'
    return 'text-green-300'
  }

  return (
    <div className="mt-4 bg-[#0f1724] border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4z" fill="#f97316"/><path d="M12 7v10" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <h3 className="text-white font-semibold">Contract Watch</h3>
          <span className="ml-2 inline-flex items-center text-xs px-2 py-0.5 rounded bg-gray-700 text-orange-400">AI Monitoring</span>
        </div>
      </div>

      {loading && <div className="text-gray-400">Loading...</div>}
      {!loading && data && data.length===0 && <div className="text-gray-400">No active contract deadlines</div>}

      {!loading && data && data.length>0 && (
        <div className="space-y-3 max-h-56 overflow-y-auto">
          {data.map((d,i)=> (
            <div key={i} className="p-3 bg-[#071224] rounded border border-gray-800">
              <div className="text-sm text-gray-300 font-medium">{d.address}</div>
              <div className="mt-2 space-y-1">
                {d.milestones.map((m,idx)=> (
                  <div key={idx} className="flex items-center justify-between">
                    <div className={m.daysRemaining===null? 'text-gray-400 text-sm' : 'text-sm text-gray-200'}>{m.label}</div>
                    <div className="text-sm flex items-center gap-3">
                      <div className={daysClass(m.daysRemaining)}>{m.dueDate ? new Date(m.dueDate).toLocaleDateString() : 'TBD'}</div>
                      <div className={daysClass(m.daysRemaining) + ' text-xs'}>
                        {m.daysRemaining===null ? (m.status || '') : `${m.daysRemaining}d`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
