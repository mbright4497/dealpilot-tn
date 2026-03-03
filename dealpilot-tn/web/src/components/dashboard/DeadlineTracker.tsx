"use client"
import React, { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type Row = { id:string; address:string; milestone:string; date:string|null; days:number|null }

export default function DeadlineTracker(){
  const supabase = createClientComponentClient()
  const [rows,setRows] = useState<Row[]>([])
  const [loading,setLoading] = useState(true)

  useEffect(()=>{
    let mounted=true
    async function load(){
      setLoading(true)
      const { data } = await supabase.from('transactions').select('id,address,binding,closing,status')
      const txs = Array.isArray(data)?data:[]
      const out:Row[] = []
      const now = Date.now()
      for(const t of txs){
        const binding = t.binding ? new Date(t.binding) : null
        const closing = t.closing ? new Date(t.closing) : null
        if(binding){
          out.push({ id:t.id, address:t.address, milestone:'Binding', date: binding.toISOString(), days: Math.ceil((binding.getTime()-now)/(1000*60*60*24)) })
          const inspection = new Date(binding); inspection.setDate(inspection.getDate()+10)
          out.push({ id:t.id, address:t.address, milestone:'Inspection End', date: inspection.toISOString(), days: Math.ceil((inspection.getTime()-now)/(1000*60*60*24)) })
          const title = new Date(binding); title.setDate(title.getDate()+14)
          out.push({ id:t.id, address:t.address, milestone:'Title Search', date: title.toISOString(), days: Math.ceil((title.getTime()-now)/(1000*60*60*24)) })
          const appraisal = new Date(binding); appraisal.setDate(appraisal.getDate()+21)
          out.push({ id:t.id, address:t.address, milestone:'Appraisal', date: appraisal.toISOString(), days: Math.ceil((appraisal.getTime()-now)/(1000*60*60*24)) })
        }
        if(closing){
          out.push({ id:t.id, address:t.address, milestone:'Closing', date: closing.toISOString(), days: Math.ceil((closing.getTime()-now)/(1000*60*60*24)) })
          const finalWalk = new Date(closing); finalWalk.setDate(finalWalk.getDate()-1)
          out.push({ id:t.id, address:t.address, milestone:'Final Walkthrough', date: finalWalk.toISOString(), days: Math.ceil((finalWalk.getTime()-now)/(1000*60*60*24)) })
        }
      }
      // sort by days ascending, put nulls at end
      out.sort((a,b)=>{
        const ad = a.days===null?9999:a.days
        const bd = b.days===null?9999:b.days
        return ad-bd
      })
      if(mounted) setRows(out)
      setLoading(false)
    }
    load()
    return ()=>{ mounted=false }
  },[])

  const badge = (days:number|null)=>{
    if(days===null) return <span className="px-2 py-1 rounded text-sm bg-gray-600">N/A</span>
    if(days<=0) return <span className="px-2 py-1 rounded text-sm bg-red-600">Due / Overdue</span>
    if(days<=3) return <span className="px-2 py-1 rounded text-sm bg-yellow-500 text-black">Soon ({days}d)</span>
    return <span className="px-2 py-1 rounded text-sm bg-green-600">{days}d</span>
  }

  return (
    <div className="bg-[#0f1c2e] border border-[#1e3a5f] rounded-xl p-4 mt-4">
      <h3 className="text-lg font-semibold mb-3">Deadline Tracker</h3>
      {loading ? (
        <div className="animate-pulse text-gray-400">Loading deadlines...</div>
      ) : rows.length===0 ? (
        <div className="text-gray-400">No deadlines found.</div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-gray-300">
              <th className="p-2">Deal</th>
              <th className="p-2">Milestone</th>
              <th className="p-2">Due Date</th>
              <th className="p-2">Days</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=> (
              <tr key={r.id + r.milestone} className="border-t border-[#11314f]">
                <td className="p-2">{r.address}</td>
                <td className="p-2">{r.milestone}</td>
                <td className="p-2 text-gray-300">{r.date? new Date(r.date).toLocaleDateString(): '—'}</td>
                <td className="p-2">{r.days===null? '—' : r.days}</td>
                <td className="p-2">{badge(r.days)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
