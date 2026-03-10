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
          <button onClick={()=>{
            // Ask Eva to show deal detail inline
            addMessage({ id:`deal-detail-${tx.id}-${Date.now()}`, role:'eva', content: `Details for ${tx.address}`, payload: { type: 'deal_detail', data: tx } })
            // also emit an event so page-level listeners can open legacy detail if needed
            if(typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('eva:viewDeal', { detail: { id: tx.id } }))
          }} className="px-3 py-1 rounded bg-cyan-500 text-black">View Deal</button>
        </div>
      </div>
    )
  }
  if(t==='contract_review'){
    const d = payload.data
    const buyers = (d.buyerNames||[]).join(', ')
    const sellers = (d.sellerNames||[]).join(', ')
    return (
      <div className="bg-[#0f1c2e] border border-[#1e3a5f] p-4 rounded-lg shadow-sm">
        <div className="font-semibold text-white text-lg">Contract Review</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
          <div><div className="text-xs text-gray-400">Property</div><div className="font-medium text-white">{d.propertyAddress||'—'}</div></div>
          <div><div className="text-xs text-gray-400">Type</div><div className="font-medium text-white">{d.contractType || '—'}</div></div>
          <div><div className="text-xs text-gray-400">Buyer(s)</div><div className="font-medium text-white">{buyers || '—'}</div></div>
          <div><div className="text-xs text-gray-400">Seller(s)</div><div className="font-medium text-white">{sellers || '—'}</div></div>
          <div><div className="text-xs text-gray-400">Price</div><div className="font-medium text-white">{d.purchasePrice ? `$${Number(d.purchasePrice).toLocaleString()}` : '—'}</div></div>
          <div><div className="text-xs text-gray-400">Earnest</div><div className="font-medium text-white">{d.earnestMoney ? `$${Number(d.earnestMoney).toLocaleString()}` : '—'}</div></div>
          <div><div className="text-xs text-gray-400">Binding</div><div className="font-medium text-white">{d.bindingDate || '—'}</div></div>
          <div><div className="text-xs text-gray-400">Closing</div><div className="font-medium text-white">{d.closingDate || '—'}</div></div>
        </div>
        <div className="mt-3 text-sm text-gray-300">Issues: {d.issues && d.issues.length? d.issues.join(', ') : 'None detected'}</div>
        <div className="mt-4 flex gap-2">
          <button onClick={async ()=>{
            try{
              const res = await fetch('/api/eva/wizard/create-deal', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(d) })
              const j = await res.json()
              if(!res.ok){ addMessage({ id:'eva_err_'+Date.now(), role:'eva', content: 'Failed to create deal: '+(j?.error||'unknown') }); return }
              addMessage({ id:'deal-created-'+Date.now(), role:'eva', content: `✅ Deal Created: ${j.address || ''}`, payload: { type:'deal_created', data: j } })
            }catch(e){ console.error(e); addMessage({ id:'eva_err_'+Date.now(), role:'eva', content:'Failed to create deal.' }) }
          }} className="px-3 py-1 rounded bg-green-500 text-black">✅ Looks Good — Create Deal</button>
          <button onClick={()=>{ addMessage({ id:'eva_edit_req_'+Date.now(), role:'eva', content: 'Tell me what needs to change.' }) }} className="px-3 py-1 rounded bg-gray-800 text-white">✏️ Edit Details</button>
        </div>
      </div>
    )
  }
  if(t==='chips'){
    const chips = payload.chips || []
    return (
      <div className="flex flex-wrap gap-2">
        {chips.map((c:any, i:number)=>(
          <button key={i} onClick={()=>{ if(typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('eva:doAction',{ detail: c })) }} className="px-3 py-1 rounded bg-[#1e3a5f] text-cyan-300 hover:bg-cyan-500/10">{c.label || c}</button>
        ))}
      </div>
    )
  }

  if(t==='deal_detail'){
    const d = payload.data
    const daysToClose = d.closing ? Math.max(0, Math.ceil((new Date(d.closing).getTime()-Date.now())/(1000*60*60*24))) : null
    const progress = d.current_state === 'closed' ? 100 : d.current_state === 'draft' ? 10 : d.current_state === 'inspection_period' ? 65 : 40
    return (
      <div className="bg-[#0f1c2e] border border-[#1e3a5f] p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-white">{String(d.address||'')}</div>
            <div className="text-sm text-gray-300">{String(d.client||'')}</div>
          </div>
          <div className="text-sm text-gray-300">{daysToClose===null? 'TBD' : `${daysToClose}d`}</div>
        </div>
        <div className="mt-3">
          <div className="w-full bg-gray-700 rounded-full h-2"><div className="h-2 rounded-full bg-cyan-400" style={{width:`${progress}%`}} /></div>
          <div className="text-xs text-gray-400 mt-2">{progress}% • {d.closing? d.closing : 'No closing date'}</div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={()=>{ if(typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('eva:uploadDocument', { detail: { dealId: d.id } })) }} className="px-3 py-1 rounded bg-gray-800 text-white">Upload Document</button>
          <button onClick={()=>{ if(typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('eva:viewParties', { detail: { dealId: d.id } })) }} className="px-3 py-1 rounded bg-gray-800 text-white">View Parties</button>
          <button onClick={()=>{ if(typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('eva:editDeal', { detail: { dealId: d.id } })) }} className="px-3 py-1 rounded bg-gray-800 text-white">Edit Deal</button>
        </div>
      </div>
    )
  }
  return (<div className="bg-[#0f1c2e] border border-[#1e3a5f] p-3 rounded">Unknown payload</div>)
}
