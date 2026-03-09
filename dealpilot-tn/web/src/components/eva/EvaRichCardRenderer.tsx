"use client"
import React from 'react'
import { useEva } from './EvaProvider'

export default function EvaRichCardRenderer({payload}:{payload:any}){
  if(!payload) return null
  const t = payload.type
  const { addMessage } = useEva()
  if(t==='deal_summary'){
    return (<div className="bg-[#0f1c2e] border border-[#1e3a5f] p-3 rounded"><div className="font-semibold">Deal Summary</div><div className="text-sm text-gray-300">{payload.summary}</div></div>)
  }
  if(t==='deadline_risk'){
    return (<div className="bg-[#0f1c2e] border border-[#1e3a5f] p-3 rounded"><div className="font-semibold">Deadline Risk</div><div className="text-sm text-gray-300">{payload.note}</div></div>)
  }
  if(t==='transaction_card'){
    const tx = payload.data
    const daysToClose = tx.closing ? Math.max(0, Math.ceil((new Date(tx.closing).getTime()-Date.now())/(1000*60*60*24))) : null
    const progress = tx.current_state === 'closed' ? 100 : tx.current_state === 'draft' ? 10 : tx.current_state === 'inspection_period' ? 65 : 40
    const badge = tx.state_label || tx.status || '—'
    return (
      <div className="bg-[#0f1c2e] border border-[#1e3a5f] p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-white">{String(tx.address||'')}</div>
            <div className="text-sm text-gray-300">{String(tx.client||'')}</div>
          </div>
          <div className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-500 text-black">{badge}</div>
        </div>
        <div className="mt-3">
          <div className="w-full bg-gray-700 rounded-full h-2"><div className="h-2 rounded-full bg-cyan-400" style={{width:`${progress}%`}} /></div>
          <div className="text-xs text-gray-400 mt-2">{progress}% • {daysToClose===null? 'TBD' : `${daysToClose}d to close`} • {tx.closing? tx.closing : 'No closing date'}</div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={()=>{ addMessage({ id:`tell-${tx.id}-${Date.now()}`, role:'user', content: `Tell me about ${tx.address}` }); }} className="px-3 py-1 rounded bg-cyan-500 text-black">View Deal</button>
        </div>
      </div>
    )
  }
  return (<div className="bg-[#0f1c2e] border border-[#1e3a5f] p-3 rounded">Unknown payload</div>)
}
