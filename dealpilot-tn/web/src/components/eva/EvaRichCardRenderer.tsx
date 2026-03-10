"use client"
import React from 'react'
import { useEva } from './EvaProvider'

export default function EvaRichCardRenderer({payload}:{payload:any}){
  if(!payload) return null
  const t = payload.type
  const { addMessage, messages, pageContext } = useEva()
  if(t==='deal_summary'){
    return (<div className="bg-[#0f1c2e] border border-[#1e3a5f] p-3 rounded"><div className="font-semibold">Deal Summary</div><div className="text-sm text-gray-300">{payload.summary}</div></div>)
  }
  if(t==='deadline_risk'){
    return (<div className="bg-[#0f1c2e] border border-[#1e3a5f] p-3 rounded"><div className="font-semibold">Deadline Risk</div><div className="text-sm text-gray-300">{payload.note}</div></div>)
  }
  if(t==='transaction_card'){
    // accept payload.data or payload itself (defensive)
    const tx = (payload && (payload.data || payload)) || {}
    const { addMessage, messages, pageContext } = useEva()
    // explicit mapping for API fields used by deals API
    const addr = tx.property_address || tx.address || tx.address_line || tx.propertyAddress || tx.address_line_1 || ''
    const client = tx.client_name || tx.client || tx.buyer || tx.primary_contact || tx.contact_name || ''
    const closingDate = tx.closing_date || tx.closing || tx.closingDate || tx.closing_at || null
    const daysToClose = closingDate ? Math.max(0, Math.ceil((new Date(closingDate).getTime()-Date.now())/(1000*60*60*24))) : null
    const state = tx.phase || tx.current_state || tx.state || tx.status || ''
    const progress = state === 'closed' ? 100 : state === 'draft' ? 10 : state === 'inspection_period' ? 65 : 40
    const badge = tx.state_label || tx.status_label || tx.status || state || '—'
    const id = tx.id || tx.deal_id || tx.tx_id || null
    const navigateToDeal = (targetId:any)=>{
      if(!targetId) return
      if(typeof window !== 'undefined'){
        // SPA navigation: dispatch event to open deal detail in-app
        if(typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('eva:viewDeal', { detail: { id: targetId } }))
      }
    }

    const sendChipAction = async (chip:any)=>{
      const label = chip.label || chip
      const mid = `user_${Date.now()}`
      addMessage({ id: mid, role: 'user', content: label })
      // build messages history for API
      const history = Array.isArray(messages) ? messages.map((m:any)=>({ role: m.role, content: m.content })) : []
      const apiMessages = [...history, { role: 'user', content: label }]
      try{
        const res = await fetch('/api/eva/chat', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ messages: apiMessages, dealId: pageContext?.dealId || id }) })
        const j = await res.json()
        addMessage({ id: `eva_${Date.now()}`, role: 'eva', content: j.reply || 'EVA response', payload: j.renderPayload })
      }catch(e){ console.error('chip action failed', e); addMessage({ id:`eva_err_${Date.now()}`, role:'eva', content: 'EVA is unavailable.' }) }
    }

    return (
      <div className="bg-[#0f1c2e] border border-[#1e3a5f] p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-white">{addr || 'No address available'}</div>
            <div className="text-sm text-gray-300">{client || 'No client name'}</div>
          </div>
          <div className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-500 text-black">{badge}</div>
        </div>
        <div className="mt-3">
          <div className="w-full bg-gray-700 rounded-full h-2"><div className="h-2 rounded-full bg-cyan-400" style={{width:`${progress}%`}} /></div>
          <div className="text-xs text-gray-400 mt-2">{progress}% • {daysToClose===null? 'TBD' : `${daysToClose}d to close`} • {closingDate? new Date(closingDate).toLocaleDateString() : 'No closing date'}</div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={()=>{ addMessage({ id:`deal-detail-${id}-${Date.now()}`, role:'eva', content: `Details for ${addr}`, payload: { type: 'deal_detail', data: tx } }); navigateToDeal(id) }} className="px-3 py-1 rounded bg-cyan-500 text-black">View Deal</button>
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
    const handleClick = async (c:any)=>{
      const label = c.label || c
      addMessage({ id:`user_${Date.now()}`, role:'user', content: label })
      const history = Array.isArray(messages) ? messages.map((m:any)=>({ role: m.role, content: m.content })) : []
      const apiMessages = [...history, { role: 'user', content: label }]
      try{
        const res = await fetch('/api/eva/chat', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ messages: apiMessages, dealId: pageContext?.dealId }) })
        const j = await res.json()
        addMessage({ id:`eva_${Date.now()}`, role:'eva', content: j.reply || 'EVA response', payload: j.renderPayload })
      }catch(e){ console.error('chip action failed', e); addMessage({ id:`eva_err_${Date.now()}`, role:'eva', content: 'EVA is unavailable.' }) }
    }
    return (
      <div className="flex flex-wrap gap-2">
        {chips.map((c:any, i:number)=>(
          <button key={i} onClick={()=>handleClick(c)} className="px-3 py-1 rounded bg-[#1e3a5f] text-cyan-300 hover:bg-cyan-500/10">{c.label || c}</button>
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

  if(t==='draft_email'){
    const e = payload.data || {}
    const sendPreview = async ()=>{
      // show a preview message in the conversation so user can inspect before confirming
      addMessage({ id:'eva_email_preview_'+Date.now(), role:'eva', content:'Previewing email below. Click Confirm Send to actually send.' })
      addMessage({ id:'eva_email_preview_body_'+Date.now(), role:'eva', content:`To: ${e.to || '—'}\nSubject: ${e.subject || '—'}\n\n${e.body || ''}` })
    }
    const confirmAndSend = async ()=>{
      if(typeof window !== 'undefined'){
        const ok = window.confirm('Confirm send this email? This will deliver the message to the recipient.')
        if(!ok){ addMessage({ id:'eva_send_cancel_'+Date.now(), role:'eva', content:'Send cancelled.' }); return }
      }
      try{
        const res = await fetch('/api/communications/send', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ draft: e, confirmed: true }) })
        const j = await res.json()
        if(!res.ok){ addMessage({ id:'eva_send_err_'+Date.now(), role:'eva', content:'Failed to send: '+(j?.error||'unknown') }); return }
        addMessage({ id:'eva_sent_'+Date.now(), role:'eva', content:'✅ Email sent.' })
      }catch(err){ console.error(err); addMessage({ id:'eva_send_err_'+Date.now(), role:'eva', content:'Failed to send email.' }) }
    }

    return (
      <div className="bg-[#0f1c2e] border border-[#1e3a5f] p-4 rounded-lg">
        <div className="font-semibold text-white">Draft Email: {e.subject}</div>
        <pre className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{e.body}</pre>
        <div className="mt-3 flex gap-2">
          <button onClick={sendPreview} className="px-3 py-1 rounded bg-cyan-500 text-black">Preview</button>
          <button onClick={confirmAndSend} className="px-3 py-1 rounded bg-green-600 text-black">Confirm Send</button>
          <button onClick={()=>{ addMessage({ id:'eva_edit_'+Date.now(), role:'eva', content:'Okay — tell me what to change.' }) }} className="px-3 py-1 rounded bg-gray-800 text-white">Edit</button>
        </div>
      </div>
    )
  }

  return (<div className="bg-[#0f1c2e] border border-[#1e3a5f] p-3 rounded">Unknown payload</div>)
}
