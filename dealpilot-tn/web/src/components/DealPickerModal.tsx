'use client'
import React, { useEffect, useState } from 'react'
import ClosingPilotLogo from './ClosingPilotLogo'

export type DealSummary = { id:number; address?:string; client?:string; status?:string; closing_date?:string }

export default function DealPickerModal({ open, selectedDealId=null, onClose, onSelect }:{open:boolean, selectedDealId?:number|null, onClose:()=>void, onSelect:(d:DealSummary)=>void}){
  const [deals,setDeals]=useState<DealSummary[]>([])
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState<string|null>(null)

  useEffect(()=>{
    if(!open) return
    let cancelled=false
    ;(async ()=>{
      setLoading(true); setError(null)
      try{
        const res=await fetch('/api/transactions')
        if(!res.ok) throw new Error('Unable to load deals')
        const payload=await res.json()
        if(cancelled) return
        setDeals(Array.isArray(payload)?payload:(payload.result||[]))
      }catch(e:any){ if(!cancelled) setError(e.message||'Failed to load deals') }
      finally{ if(!cancelled) setLoading(false) }
    })()
    return ()=>{ cancelled=true }
  },[open])

  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#030712] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <ClosingPilotLogo size="sm" />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Select a deal</p>
              <p className="text-lg font-semibold text-white">Connect your RF401 wizard to an existing transaction.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">Close</button>
        </div>
        <div className="p-6">
          {loading && <div className="text-sm text-gray-300">Loading deals…</div>}
          {error && <div className="rounded bg-red-900/40 px-3 py-2 text-sm text-red-200">{error}</div>}
          <div className="mt-4 space-y-3 max-h-[340px] overflow-y-auto">
            {!loading && deals.length===0 && <div className="rounded-2xl border border-white/10 bg-[#07101a] p-3 text-sm text-gray-400">No active deals available.</div>}
            {deals.map(d=> (
              <button key={d.id} onClick={()=>onSelect(d)} className={`w-full text-left rounded-2xl border px-4 py-3 transition-colors ${d.id===selectedDealId?'border-orange-500 bg-orange-500/5':'border-white/10 bg-[#050c14] hover:border-white/30'}`}>
                <div className="text-sm text-gray-400">Deal #{d.id}</div>
                <div className="text-lg font-semibold text-white">{d.address || d.client || 'Unnamed deal'}</div>
                <div className="flex items-center justify-between text-xs text-gray-400"><span>{d.client||'Unknown client'}</span><span className="text-[0.65rem] uppercase">{d.status||'Status unknown'}</span></div>
                {d.closing_date && (()=>{ const parsed=new Date(d.closing_date); if(Number.isNaN(parsed.getTime())) return <div className="mt-2 text-xs text-cyan-300">Closing: TBD</div>; return <div className="mt-2 text-xs text-cyan-300">Closing: {parsed.toLocaleDateString()}</div>; })()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
