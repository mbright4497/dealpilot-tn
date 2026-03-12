'use client'
import React, { useEffect, useState } from 'react'

export default function ContractWatch(){
  const [items, setItems] = useState<any[]|null>(null)
  useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        const res = await fetch('/api/contract-watch')
        if(!mounted) return
        if(!res.ok) { setItems([]); return }
        const j = await res.json()
        setItems(j.milestones || [])
      }catch(e){ console.error(e); if(mounted) setItems([]) }
    })()
    return ()=>{ mounted=false }
  },[])

  if (items === null) return <div className="p-4 text-sm text-gray-400">Loading milestones...</div>
  if (items.length === 0) return <div className="p-4 text-sm text-cyan-300/70 text-center">No upcoming deadlines</div>

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <h3 className="font-semibold text-white">Contract Watch</h3>
      </div>
      <div className="divide-y divide-white/5">
        {items.map((d:any,i:number)=>{
          const isOverdue = d.status === 'overdue'
          const isToday = d.status === 'today'
          const isWarning = !isOverdue && !isToday && d.days_remaining <= 3
          const dotColor = isOverdue || isToday ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'
          const dateColor = isOverdue || isToday ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-500'
          return (
            <div key={i} className="p-4 flex items-start gap-3">
              <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{d.label}</p>
                <p className="text-xs text-gray-500">{d.address}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-medium whitespace-nowrap ${dateColor}`}>
                  {isOverdue ? `${Math.abs(d.days_remaining)}d overdue` : isToday ? 'Today' : `${d.days_remaining}d`}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
