'use client'
import React, {useEffect, useState} from 'react'

export default function DeadlinesPage(){
  const [items,setItems] = useState<any[]|null>(null)
  useEffect(()=>{ let mounted=true; (async ()=>{ try{ const res = await fetch('/api/deadlines'); if(!mounted) return; if(res.ok){ const j = await res.json(); setItems(j.deadlines || j || []) } else { setItems([]) } }catch(e){ if(mounted) setItems([]) } })(); return ()=>{ mounted=false } },[])
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Deadlines</h1>
      <div className="mt-2"><a href="/chat" className="text-sm text-gray-400 hover:text-white">← Back to Dashboard</a></div>
      <div className="mt-4">
        {items===null && <div className="p-4">Loading...</div>}
        {items!==null && items.length===0 && <div className="p-4">No upcoming deadlines</div>}
        {items && items.length>0 && (
          <div className="space-y-3">
            {items.map((d:any,i:number)=>{
        const days = d.days_remaining ?? Math.ceil((new Date(d.date).getTime()-Date.now())/(1000*60*60*24))
        const overdue = days < 0
        const today = days === 0
        const warn = !overdue && !today && days <=3
        const color = overdue ? 'text-red-500' : warn ? 'text-amber-400' : 'text-green-400'
        return (
          <div key={i} className="p-3 rounded bg-[#081224] flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-white">{d.label}</div>
              <div className="text-sm text-gray-400">{d.address}</div>
            </div>
            <div className={`text-sm font-semibold ${color}`}>
              {overdue ? `OVERDUE — ${Math.abs(days)}d` : today ? 'Today' : `${days}d`}
            </div>
          </div>
        )
      })}
          </div>
        )}
      </div>
    </div>
  )
}

