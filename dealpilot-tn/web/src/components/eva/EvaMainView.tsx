'use client'
'use client'
import React, {useEffect} from 'react'
import EvaConversation from './EvaConversation'
import EvaComposer from './EvaComposer'
import EvaRichCardRenderer from './EvaRichCardRenderer'
import { useEva } from './EvaProvider'
import './eva-styles.css'

export default function EvaMainView({ transactions = [], onViewDeal }:{ transactions?: any[], onViewDeal?: (id:number)=>void }){
  const { addMessage } = useEva()
  const briefingInjectedRef = React.useRef(false)

  useEffect(()=>{
    // prevent double injection (StrictMode/useEffect double-call) by guarding once per component mount
    if(briefingInjectedRef.current) return
    briefingInjectedRef.current = true

    let mounted = true
    ;(async ()=>{
      try{
        // fetch all deals for proactive briefing
        const res = await fetch('/api/deal-state/all')
        const deals = res.ok ? await res.json() : []
        if(!mounted) return
        // compute urgent deadlines and missing docs
        const urgent: any[] = []
        const missingDocs: any[] = []
        if(Array.isArray(deals)){
          for(const d of deals){
            if(d.closing_date){
              const days = Math.ceil((new Date(d.closing_date).getTime() - Date.now())/(1000*60*60*24))
              if(days <= 3) urgent.push({ id: d.id, address: d.property_address || d.address, days })
            }
            if(!d.documents || d.documents.length === 0) missingDocs.push({ id: d.id, address: d.property_address || d.address })
          }
        }
        const activeCount = Array.isArray(deals) ? deals.filter((t:any)=> (t.current_state||t.phase||'') !== 'closed').length : 0
        let brief = `Good afternoon. I see ${activeCount} active deals.`
        if(urgent.length>0) brief += ` Urgent: ${urgent.length} deal(s) due within 3 days.`
        if(missingDocs.length>0) brief += ` Missing documents on ${missingDocs.length} deal(s).`
        addMessage({ id: 'briefing-proactive-'+Date.now(), role: 'eva', content: brief })
        // Inject transaction cards for quick review (if any)
        if(Array.isArray(deals) && deals.length>0){
          deals.slice(0,6).forEach((tx:any)=> addMessage({ id:`deal-${tx.id || tx.deal_id}`, role:'eva', content:'', payload:{ type:'transaction_card', data: tx }}))
        } else {
          // If no deals or fetch failed, fallback to server briefing API
          try{
            const b = await fetch('/api/eva/briefing')
            if(b.ok){ const bj = await b.json(); if(bj?.message) addMessage({ id:'eva_briefing_fallback_'+Date.now(), role:'eva', content: bj.message }) }
          }catch(_){ }
        }
        // Action suggestions
        addMessage({ id:'briefing-actions-'+Date.now(), role:'eva', content:'What would you like me to do?', payload:{ type:'chips', chips:[ {id:'remind-inspector',label:'Draft reminder to inspector'}, {id:'send-disclosure',label:'Send disclosure to buyer'}, {id:'check-title',label:'Check title commitment status'} ] } })
      }catch(e){ console.error('eva briefing failed', e); addMessage({ id:'eva_brief_err_'+Date.now(), role:'eva', content:'I had trouble loading your briefing. Try reloading or checking your connection.' }) }
    })()
    return ()=>{ mounted=false }
  },[transactions, addMessage])

  return (
    <div className="eva-main bg-[#0a1628] min-h-screen flex">
      {/* Left strip */}
      <aside className="w-16 bg-[#071022] flex flex-col items-center py-4">
        <div className="mb-6 text-white font-bold">CP</div>
        <div className="flex-1" />
        <div className="w-8 h-8 rounded-full bg-gray-700" />
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col">
        {/* Eva header */}
        <header className="flex items-center gap-4 p-4 bg-[#0f1d32] border-b border-white/6">
          <img src="/avatar-pilot.png" alt="Eva" className="w-20 h-20 rounded-full" />
          <div>
            <div className="text-white font-bold text-lg">Eva</div>
            <div className="text-gray-300 text-sm">Your Transaction Coordinator <span className="ml-2 inline-block w-2 h-2 bg-green-400 rounded-full" /></div>
          </div>
        </header>

        {/* Conversation area */}
        <div className="flex-1 overflow-auto p-4">
          <EvaConversation />
        </div>

        {/* Composer area */}
        <div className="p-4 bg-[#071022] border-t border-white/6">
          <div className="mb-2 flex gap-2">
            <button onClick={async ()=>{ addMessage({ id: 'pill-mydeals', role: 'user', content: 'My Deals' }); const history = Array.isArray(ctx?.messages)? ctx.messages.map((m:any)=>({ role:m.role, content:m.content })):[]; try{ const res = await fetch('/api/eva/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ messages:[...history, { role:'user', content:'My Deals' }], dealId: ctx?.pageContext?.dealId })}); const j=await res.json(); addMessage({ id:'eva_'+Date.now(), role:'eva', content: j.reply || 'EVA response', payload: j.renderPayload }) }catch(e){ addMessage({ id:'eva_err_'+Date.now(), role:'eva', content:'EVA unavailable.'}) } }} className="px-3 py-1 rounded border border-cyan-500 text-cyan-400">My Deals</button>
            <button onClick={async ()=>{ addMessage({ id: 'pill-addtx', role: 'user', content: 'Add Transaction' }); const history = Array.isArray(ctx?.messages)? ctx.messages.map((m:any)=>({ role:m.role, content:m.content })):[]; try{ const res = await fetch('/api/eva/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ messages:[...history, { role:'user', content:'Add Transaction' }], dealId: ctx?.pageContext?.dealId })}); const j=await res.json(); addMessage({ id:'eva_'+Date.now(), role:'eva', content: j.reply || 'EVA response', payload: j.renderPayload }) }catch(e){ addMessage({ id:'eva_err_'+Date.now(), role:'eva', content:'EVA unavailable.'}) } }} className="px-3 py-1 rounded border border-cyan-500 text-cyan-400">Add Transaction</button>
            <button onClick={async ()=>{ addMessage({ id: 'pill-deadlines', role: 'user', content: 'Deadlines' }); const history = Array.isArray(ctx?.messages)? ctx.messages.map((m:any)=>({ role:m.role, content:m.content })):[]; try{ const res = await fetch('/api/eva/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ messages:[...history, { role:'user', content:'Deadlines' }], dealId: ctx?.pageContext?.dealId })}); const j=await res.json(); addMessage({ id:'eva_'+Date.now(), role:'eva', content: j.reply || 'EVA response', payload: j.renderPayload }) }catch(e){ addMessage({ id:'eva_err_'+Date.now(), role:'eva', content:'EVA unavailable.'}) } }} className="px-3 py-1 rounded border border-cyan-500 text-cyan-400">Deadlines</button>
            <button onClick={async ()=>{ addMessage({ id: 'pill-upload', role: 'user', content: 'Upload Document' }); const history = Array.isArray(ctx?.messages)? ctx.messages.map((m:any)=>({ role:m.role, content:m.content })):[]; try{ const res = await fetch('/api/eva/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ messages:[...history, { role:'user', content:'Upload Document' }], dealId: ctx?.pageContext?.dealId })}); const j=await res.json(); addMessage({ id:'eva_'+Date.now(), role:'eva', content: j.reply || 'EVA response', payload: j.renderPayload }) }catch(e){ addMessage({ id:'eva_err_'+Date.now(), role:'eva', content:'EVA unavailable.'}) } }} className="px-3 py-1 rounded border border-cyan-500 text-cyan-400">Upload Document</button>
          </div>
          <EvaComposer />
        </div>
      </main>
    </div>
  )
}
